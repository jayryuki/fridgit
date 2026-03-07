import express from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    let result = await db.query('SELECT * FROM settings WHERE user_id = $1', [req.user.userId]);
    if (result.rows.length === 0) {
      result = await db.query('INSERT INTO settings (user_id) VALUES ($1) RETURNING *', [req.user.userId]);
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', async (req, res) => {
  const { notif_expiry, notif_recommend, notif_shared, dark_mode, expiry_warning_days } = req.body;
  try {
    const check = await db.query('SELECT id FROM settings WHERE user_id = $1', [req.user.userId]);
    if (check.rows.length === 0) {
      await db.query('INSERT INTO settings (user_id) VALUES ($1)', [req.user.userId]);
    }
    const result = await db.query(
      `UPDATE settings SET notif_expiry = COALESCE($1, notif_expiry), notif_recommend = COALESCE($2, notif_recommend),
       notif_shared = COALESCE($3, notif_shared), dark_mode = COALESCE($4, dark_mode), expiry_warning_days = COALESCE($5, expiry_warning_days)
       WHERE user_id = $6 RETURNING *`,
      [notif_expiry, notif_recommend, notif_shared, dark_mode, expiry_warning_days, req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
