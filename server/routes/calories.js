import express from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/history', async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  try {
    const result = await db.query(
      'SELECT * FROM calorie_logs WHERE user_id = $1 ORDER BY date DESC LIMIT $2',
      [req.user.userId, days]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:date', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM calorie_logs WHERE user_id = $1 AND date = $2',
      [req.user.userId, req.params.date]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { date, items_consumed } = req.body;
  if (!date || !items_consumed) return res.status(400).json({ error: 'date and items_consumed required' });
  const total_calories = items_consumed.reduce((sum, item) => sum + (item.calories || 0), 0);
  try {
    const existing = await db.query(
      'SELECT id, items_consumed FROM calorie_logs WHERE user_id = $1 AND date = $2',
      [req.user.userId, date]
    );
    let result;
    if (existing.rows.length > 0) {
      const currentItems = existing.rows[0].items_consumed || [];
      const mergedItems = [...currentItems, ...items_consumed];
      const newTotal = mergedItems.reduce((sum, item) => sum + (item.calories || 0), 0);
      result = await db.query(
        'UPDATE calorie_logs SET total_calories = $1, items_consumed = $2 WHERE id = $3 RETURNING *',
        [newTotal, JSON.stringify(mergedItems), existing.rows[0].id]
      );
    } else {
      result = await db.query(
        'INSERT INTO calorie_logs (user_id, date, total_calories, items_consumed) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.user.userId, date, total_calories, JSON.stringify(items_consumed)]
      );
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Calorie log error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
