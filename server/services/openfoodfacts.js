import { round2 } from '../utils/helpers.js';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2';

export async function lookupBarcode(barcode) {
  try {
    const response = await fetch(`${BASE_URL}/product/${barcode}.json`);
    const data = await response.json();
    return data.status === 1 ? data.product : null;
  } catch (error) {
    console.error('Open Food Facts error:', error);
    return null;
  }
}

export async function searchProducts(query, limit = 10) {
  try {
    const response = await fetch(
      `${BASE_URL}/search?search_terms=${encodeURIComponent(query)}&page_size=${limit}&json=1`
    );
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Open Food Facts search error:', error);
    return [];
  }
}

function firstNumeric(...values) {
  for (const value of values) {
    const n = parseFloat(value);
    if (!Number.isNaN(n)) return round2(n) ?? 0;
  }
  return null;
}

function inferCategory(categories = [], text = '') {
  const haystack = [...categories, text]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!haystack) return 'other';
  if (/(milk|cheese|yogurt|yoghurt|butter|cream|dairy)/.test(haystack)) return 'dairy';
  if (/(beef|pork|chicken|turkey|ham|sausage|bacon|meat|charcuterie|salami)/.test(haystack)) return 'meat';
  if (/(fish|salmon|tuna|shrimp|prawn|crab|seafood|mussel|sardine)/.test(haystack)) return 'seafood';
  if (/(vegetable|broccoli|spinach|lettuce|salad|carrot|pepper|cucumber|onion|tomato)/.test(haystack)) return 'vegetables';
  if (/(fruit|apple|banana|berry|berries|orange|grape|mango|pineapple|pear|peach)/.test(haystack)) return 'fruits';
  if (/(drink|beverage|juice|soda|sparkling|water|coffee|tea)/.test(haystack)) return 'beverages';
  if (/(sauce|condiment|ketchup|mustard|mayo|mayonnaise|dressing|vinaigrette|hot sauce|salsa|jam)/.test(haystack)) return 'condiments';
  if (/(bread|rice|pasta|cereal|grain|oat|quinoa|flour|tortilla|noodle)/.test(haystack)) return 'grains';
  if (/(cookie|cracker|chips|popcorn|snack|candy|chocolate|bar)/.test(haystack)) return 'snacks';
  return 'other';
}

export function normalizeProduct(product) {
  const nutriments = product.nutriments || {};
  const categories = product.categories_tags || [];
  const categoryText = product.categories || '';
  const category = inferCategory(categories, categoryText);

  const calories = firstNumeric(
    nutriments['energy-kcal_serving'],
    nutriments['energy-kcal_value'],
    nutriments['energy-kcal'],
    nutriments['energy-kcal_100g']
  );
  const nutrition_basis = firstNumeric(nutriments['energy-kcal_serving']) != null ? 'serving' : '100g';

  const emojiMap = { dairy: '\u{1F95B}', meat: '\u{1F357}', vegetables: '\u{1F96C}', fruits: '\u{1F34E}', beverages: '\u{1F964}', condiments: '\u{1FAD9}', seafood: '\u{1F41F}', grains: '\u{1F33E}', snacks: '\u{1F36A}', other: '\u{1F4E6}' };
  const colorMap = { dairy: '#E8F5E9', meat: '#FFF3E0', vegetables: '#E8F5E9', fruits: '#FCE4EC', beverages: '#E3F2FD', condiments: '#FFEBEE', seafood: '#E3F2FD', grains: '#FFF8E1', snacks: '#F3E5F5', other: '#F5F5F5' };

  return {
    name: product.product_name || 'Unknown Product',
    barcode: product.code,
    category,
    calories,
    nutrition_basis,
    protein: firstNumeric(nutriments.proteins_100g),
    carbs: firstNumeric(nutriments.carbohydrates_100g),
    fat: firstNumeric(nutriments.fat_100g),
    emoji: emojiMap[category] || '\u{1F4E6}',
    color: colorMap[category] || '#F5F5F5',
    brand: product.brands || '',
    image_url: product.image_url || product.image_front_url || product.image_front_small_url || null
  };
}
