import express from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM meals WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, date, meal_type, recipe_id, ingredients, calories } = req.body;
  if (!name || !date) return res.status(400).json({ error: 'name and date required' });
  try {
    const result = await db.query(
      'INSERT INTO meals (user_id, name, date, meal_type, recipe_id, ingredients, calories) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.userId, name, date, meal_type || 'dinner', recipe_id, ingredients, calories]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM meals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
