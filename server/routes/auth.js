import express from 'express';
import { generateToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import db from '../db/index.js';

const router = express.Router();

const isSecure = () => {
  const val = process.env.SECURE_ACCESS;
  if (val === undefined || val === '') return true;
  return val === 'true' || val === '1';
};

// Returns the current auth mode so the frontend knows which UI to show
router.get('/mode', (req, res) => {
  res.json({ secure: isSecure() });
});

// In insecure mode: returns all users for the picker screen
router.get('/users', async (req, res) => {
  if (isSecure()) {
    return res.status(403).json({ error: 'Not available in secure mode' });
  }
  try {
    const result = await db.query(
      'SELECT id, name, household_name, created_at FROM users ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  const secure = isSecure();

  if (secure) {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    try {
      const hashedPassword = await hashPassword(password);
      const result = await db.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, household_name, created_at',
        [name, email, hashedPassword]
      );
      const token = generateToken(result.rows[0].id);
      res.status(201).json({ user: result.rows[0], token });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      console.error('Register error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    try {
      const existing = await db.query('SELECT id FROM users WHERE LOWER(name) = LOWER($1)', [name.trim()]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'That name is already taken' });
      }
      const dummyEmail = `${name.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}@fridgit.local`;
      const placeholderHash = await hashPassword(`fridgit-guest-${Date.now()}`);
      const result = await db.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, household_name, created_at',
        [name.trim(), dummyEmail, placeholderHash]
      );
      const token = generateToken(result.rows[0].id);
      res.status(201).json({ user: result.rows[0], token });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

router.post('/login', async (req, res) => {
  const secure = isSecure();

  if (secure) {
    const { email, password } = req.body;
    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const user = result.rows[0];
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = generateToken(user.id);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, household_name: user.household_name } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User selection required' });
    }
    try {
      const result = await db.query('SELECT id, name, email, household_name FROM users WHERE id = $1', [userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = result.rows[0];
      const token = generateToken(user.id);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, household_name: user.household_name } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    const { verifyToken } = await import('../utils/jwt.js');
    const decoded = verifyToken(authHeader.split(' ')[1]);
    const result = await db.query('SELECT id, name, email, household_name, created_at FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
