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
    const uid = req.user.userId;
    
    // Single query with NOT EXISTS to avoid N+1 queries
    const result = await db.query(
      `INSERT INTO shopping_list (user_id, item_name, auto_generated, quantity)
       SELECT $1, name, true, 1
       FROM items
       WHERE owner_id = $1
         AND expiry_date IS NOT NULL
         AND expiry_date <= CURRENT_DATE + INTERVAL '3 days'
         AND NOT EXISTS (
           SELECT 1 FROM shopping_list sl 
           WHERE sl.user_id = $1 
             AND sl.item_name = items.name 
             AND sl.purchased = false
         )
       RETURNING *`,
      [uid]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Auto-generate shopping list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
