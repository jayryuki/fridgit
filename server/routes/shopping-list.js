import express from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM shopping_list WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { item_name, quantity } = req.body;
  if (!item_name) return res.status(400).json({ error: 'item_name required' });
  try {
    const result = await db.query(
      'INSERT INTO shopping_list (user_id, item_name, quantity) VALUES ($1, $2, $3) RETURNING *',
      [req.user.userId, item_name, quantity || 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { quantity, purchased } = req.body;
  try {
    const result = await db.query(
      'UPDATE shopping_list SET quantity = COALESCE($1, quantity), purchased = COALESCE($2, purchased) WHERE id = $3 AND user_id = $4 RETURNING *',
      [quantity, purchased, req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM shopping_list WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/', async (req, res) => {
  try {
    await db.query('DELETE FROM shopping_list WHERE user_id = $1 AND purchased = true', [req.user.userId]);
    res.json({ message: 'Cleared purchased items' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/auto-generate', async (req, res) => {
  try {
    // Only add items that are expiring within 3 days or already expired
    // Scoped to items the user owns (not all shared items globally)
    const expiring = await db.query(
      `SELECT name FROM items
       WHERE owner_id = $1
         AND expiry_date IS NOT NULL
         AND expiry_date <= CURRENT_DATE + INTERVAL '3 days'`,
      [req.user.userId]
    );
    const results = [];
    for (const item of expiring.rows) {
      // Skip if already on the shopping list (unpurchased)
      const existing = await db.query(
        'SELECT id FROM shopping_list WHERE user_id = $1 AND item_name = $2 AND purchased = false',
        [req.user.userId, item.name]
      );
      if (existing.rows.length === 0) {
        const result = await db.query(
          'INSERT INTO shopping_list (user_id, item_name, auto_generated) VALUES ($1, $2, true) RETURNING *',
          [req.user.userId, item.name]
        );
        results.push(result.rows[0]);
      }
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
