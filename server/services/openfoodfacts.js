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

function round1(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '0';
  return String(Math.round(n * 10) / 10);
}

export function normalizeProduct(product) {
  const nutriments = product.nutriments || {};
  const categories = product.categories_tags || [];

  let category = 'other';
  if (categories.some(c => c.includes('dairy'))) category = 'dairy';
  else if (categories.some(c => c.includes('meat'))) category = 'meat';
  else if (categories.some(c => c.includes('vegetable'))) category = 'vegetables';
  else if (categories.some(c => c.includes('fruit'))) category = 'fruits';
  else if (categories.some(c => c.includes('beverage'))) category = 'beverages';
  else if (categories.some(c => c.includes('condiment'))) category = 'condiments';

  const emojiMap = { dairy: '\u{1F95B}', meat: '\u{1F357}', vegetables: '\u{1F96C}', fruits: '\u{1F34E}', beverages: '\u{1F964}', condiments: '\u{1FAD9}', seafood: '\u{1F41F}', grains: '\u{1F33E}', snacks: '\u{1F36A}', other: '\u{1F4E6}' };
  const colorMap = { dairy: '#E8F5E9', meat: '#FFF3E0', vegetables: '#E8F5E9', fruits: '#FCE4EC', beverages: '#E3F2FD', condiments: '#FFEBEE', seafood: '#E3F2FD', grains: '#FFF8E1', snacks: '#F3E5F5', other: '#F5F5F5' };

  return {
    name: product.product_name || 'Unknown Product',
    barcode: product.code,
    category,
    calories: Math.round(nutriments['energy-kcal_100g'] || 0),
    protein: round1(nutriments.proteins_100g || 0),
    carbs: round1(nutriments.carbohydrates_100g || 0),
    fat: round1(nutriments.fat_100g || 0),
    emoji: emojiMap[category] || '\u{1F4E6}',
    color: colorMap[category] || '#F5F5F5',
    brand: product.brands || '',
    image_url: product.image_url || product.image_front_url || product.image_front_small_url || null
  };
}
