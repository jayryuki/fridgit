import express from 'express';
import db from '../db/index.js';
import { lookupBarcode, normalizeProduct } from '../services/openfoodfacts.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

function round2(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return String(Math.round(n * 100) / 100);
}

router.get('/', async (req, res) => {
  try {
    const uid = Number(req.user.userId);
    const result = await db.query(
      'SELECT * FROM items WHERE owner_id = $1 OR shared = true OR shared_with @> $2::jsonb ORDER BY created_at DESC',
      [uid, JSON.stringify([uid])]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, barcode, category, quantity, unit, location, expiry_date, calories, protein, carbs, fat, emoji, color, shared, shared_with, image_url } = req.body;
  let itemData = { name, barcode, category, quantity: quantity || 1, unit: unit || 'count', location: location || 'fridge', expiry_date, calories: round2(calories), protein: round2(protein), carbs: round2(carbs), fat: round2(fat), emoji, color, shared: shared || false, shared_with: JSON.stringify(shared_with || []), image_url: image_url || null };

  if (barcode && calories == null) {
    const product = await lookupBarcode(barcode);
    if (product) {
      const normalized = normalizeProduct(product);
      itemData = { ...itemData, ...normalized, barcode };
    }
  }

  try {
    const result = await db.query(
      `INSERT INTO items (name, barcode, category, quantity, unit, location, expiry_date, calories, protein, carbs, fat, emoji, color, shared, shared_with, image_url, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [itemData.name, itemData.barcode, itemData.category, itemData.quantity, itemData.unit, itemData.location, itemData.expiry_date, itemData.calories, itemData.protein, itemData.carbs, itemData.fat, itemData.emoji, itemData.color, itemData.shared, itemData.shared_with, itemData.image_url, req.user.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, barcode, category, quantity, unit, location, expiry_date, shared, shared_with, image_url } = req.body;
  try {
    const sharedWithVal = shared_with !== undefined ? JSON.stringify(shared_with) : undefined;
    const result = await db.query(
      `UPDATE items SET name=COALESCE($1,name), barcode=COALESCE($2,barcode), category=COALESCE($3,category), quantity=COALESCE($4,quantity), unit=COALESCE($5,unit), location=COALESCE($6,location), expiry_date=$7, shared=COALESCE($8,shared), shared_with=COALESCE($9,shared_with), image_url=COALESCE($10,image_url) WHERE id=$11 AND owner_id=$12 RETURNING *`,
      [name, barcode, category, quantity, unit, location, expiry_date || null, shared, sharedWithVal, image_url, id, req.user.userId]
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
    const uid = Number(req.user.userId);
    const item = await db.query('SELECT * FROM items WHERE id = $1 AND (owner_id = $2 OR shared = true OR shared_with @> $3::jsonb)', [req.params.id, uid, JSON.stringify([uid])]);
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
    const uid = Number(req.user.userId);
    const result = await db.query(
      `SELECT * FROM items WHERE (owner_id = $1 OR shared = true OR shared_with @> $3::jsonb) AND expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + $2 * INTERVAL '1 day' ORDER BY expiry_date ASC`,
      [uid, days, JSON.stringify([uid])]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
