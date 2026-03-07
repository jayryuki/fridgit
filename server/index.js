import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Setup routes (always available)
import setupRouter from './routes/setup.js';
app.use('/api/setup', setupRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Lazy-load API routes only when configured
app.use('/api', async (req, res, next) => {
  if (req.path.startsWith('/setup')) return next('route');
  if (!fs.existsSync(envPath)) {
    return res.status(503).json({ error: 'App not configured. Complete setup first.' });
  }
  next();
});

// Import and mount all API routes
import authRouter from './routes/auth.js';
import itemsRouter from './routes/items.js';
import barcodeRouter from './routes/barcode.js';
import shoppingRouter from './routes/shopping-list.js';
import mealsRouter from './routes/meals.js';
import recipesRouter from './routes/recipes.js';
import caloriesRouter from './routes/calories.js';
import settingsRouter from './routes/settings.js';

app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/barcode', barcodeRouter);
app.use('/api/shopping-list', shoppingRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/calories', caloriesRouter);
app.use('/api/settings', settingsRouter);

// Auto-init schema on startup if configured
if (fs.existsSync(envPath)) {
  const { initializeSchema } = await import('./db/schema.js');
  initializeSchema().then(() => {
    console.log('Schema check complete');
  }).catch(err => {
    console.error('Schema init error:', err.message);
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fridgit server running on http://0.0.0.0:${PORT}`);
  if (!fs.existsSync(envPath)) {
    console.log('No .env found - visit the app to complete setup');
  }
});
