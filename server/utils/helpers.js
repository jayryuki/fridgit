export function round2(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return Math.round(n * 100) / 100;
}

export function round2Empty(val) {
  const n = parseFloat(val);
  if (val == null || val === '' || isNaN(n)) return '';
  return String(Math.round(n * 100) / 100);
}

export function hasNutrition(v) {
  return v != null && v !== '' && v !== false;
}

export function getDaysUntilExpiry(date) {
  if (!date) return null;
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}

export function validatePositiveInt(value, defaultVal = 0, maxVal = 365) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < defaultVal || parsed > maxVal) {
    return defaultVal;
  }
  return parsed;
}
