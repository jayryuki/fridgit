import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const apiKey = process.env.SPOONACULAR_API_KEY;

router.get('/suggestions', async (req, res) => {
  const { ingredients } = req.query;

  if (!apiKey) {
    return res.status(500).json({ error: 'Spoonacular API key not configured' });
  }

  if (!ingredients || typeof ingredients !== 'string') {
    return res.status(400).json({ error: 'ingredients query parameter is required' });
  }

  try {
    const response = await fetch(
      `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&number=15&apiKey=${apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Spoonacular error: ${errorText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Recipe suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch recipe suggestions' });
  }
});

router.post('/bulk-info', async (req, res) => {
  const { ids } = req.body ?? {};

  if (!apiKey) {
    return res.status(500).json({ error: 'Spoonacular API key not configured' });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }

  try {
    const response = await fetch(
      `https://api.spoonacular.com/recipes/informationBulk?ids=${encodeURIComponent(ids.join(','))}&apiKey=${apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Spoonacular error: ${errorText}` });
    }

    const data = await response.json();
    const slim = data.map((recipe) => ({
      id: recipe.id,
      readyInMinutes: recipe.readyInMinutes,
      cuisines: Array.isArray(recipe.cuisines) ? recipe.cuisines : [],
    }));

    res.json(slim);
  } catch (error) {
    console.error('Recipe bulk info error:', error);
    res.status(500).json({ error: 'Failed to fetch recipe bulk info' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!apiKey) {
    return res.status(500).json({ error: 'Spoonacular API key not configured' });
  }

  try {
    const response = await fetch(
      `https://api.spoonacular.com/recipes/${encodeURIComponent(id)}/information?apiKey=${apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Spoonacular error: ${errorText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Recipe details error:', error);
    res.status(500).json({ error: 'Failed to fetch recipe details' });
  }
});

export default router;
