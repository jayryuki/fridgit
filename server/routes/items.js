import express from 'express';
import db from '../db/index.js';
import { lookupBarcode, normalizeProduct } from '../services/openfoodfacts.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM items WHERE owner_id = $1 OR shared = true ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, barcode, category, quantity, unit, location, expiry_date, calories, protein, carbs, fat, emoji, color, shared } = req.body;
  let itemData = { name, barcode, category, quantity: quantity || 1, unit: unit || 'count', location: location || 'fridge', expiry_date, calories, protein, carbs, fat, emoji, color, shared: shared || false };

  if (barcode && !calories) {
    const product = await lookupBarcode(barcode);
    if (product) {
      const normalized = normalizeProduct(product);
      itemData = { ...itemData, ...normalized, barcode };
    }
  }

  try {
    const result = await db.query(
      `INSERT INTO items (name, barcode, category, quantity, unit, location, expiry_date, calories, protein, carbs, fat, emoji, color, shared, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [itemData.name, itemData.barcode, itemData.category, itemData.quantity, itemData.unit, itemData.location, itemData.expiry_date, itemData.calories, itemData.protein, itemData.carbs, itemData.fat, itemData.emoji, itemData.color, itemData.shared, req.user.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, barcode, category, quantity, unit, location, expiry_date, shared } = req.body;
  try {
    const result = await db.query(
      `UPDATE items SET name=COALESCE($1,name), barcode=COALESCE($2,barcode), category=COALESCE($3,category), quantity=COALESCE($4,quantity), unit=COALESCE($5,unit), location=COALESCE($6,location), expiry_date=COALESCE($7,expiry_date), shared=COALESCE($8,shared) WHERE id=$9 AND owner_id=$10 RETURNING *`,
      [name, barcode, category, quantity, unit, location, expiry_date, shared, id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM items WHERE id = $1 AND owner_id = $2 RETURNING id', [req.params.id, req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/consume', async (req, res) => {
  const { quantity = 1 } = req.body;
  try {
    const item = await db.query('SELECT * FROM items WHERE id = $1 AND (owner_id = $2 OR shared = true)', [req.params.id, req.user.userId]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Item not found' });

    const currentItem = item.rows[0];
    if (currentItem.quantity <= quantity) {
      await db.query('DELETE FROM items WHERE id = $1', [req.params.id]);
      res.json({ message: 'Item consumed and removed', removed: true, item: currentItem });
    } else {
      const result = await db.query(
        'UPDATE items SET quantity = quantity - $1 WHERE id = $2 RETURNING *',
        [quantity, req.params.id]
      );
      res.json({ message: 'Item partially consumed', removed: false, item: result.rows[0] });
    }
  } catch (error) {
    console.error('Consume error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/expiring', async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  try {
    const result = await db.query(
      `SELECT * FROM items WHERE (owner_id = $1 OR shared = true) AND expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + $2 * INTERVAL '1 day' ORDER BY expiry_date ASC`,
      [req.user.userId, days]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
