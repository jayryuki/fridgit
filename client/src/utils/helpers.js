// ── Shared helper functions ───────────────────────────────────────
// Pure utility functions used across multiple pages / components.

/**
 * Round a numeric value to 2 decimal places for display.
 * Returns '-' when the value is empty / invalid (used in detail views).
 */
export function r2(val) {
  const n = parseFloat(val);
  if (val == null || val === '' || isNaN(n)) return '-';
  return String(Math.round(n * 100) / 100);
}

/**
 * Same rounding but returns '' for invalid values (used in form inputs
 * like NewItem where an empty string keeps the field blank).
 */
export function r2Empty(val) {
  const n = parseFloat(val);
  if (val == null || val === '' || isNaN(n)) return '';
  return String(Math.round(n * 100) / 100);
}

/** Check whether a nutrition value is present and truthy. */
export function hasNutrition(v) {
  return v != null && v !== '' && v !== false;
}

/** Number of days from now until the given ISO date string. */
export function getDaysUntilExpiry(date) {
  if (!date) return null;
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}

/**
 * Tailwind class string for an expiry-day badge (background + text colour).
 * Used by Home page "Needs attention" list.
 */
export function getExpiryColor(days) {
  if (days <= 1)
    return 'bg-fridgit-dangerPale dark:bg-dracula-red/20 text-fridgit-danger dark:text-dracula-red';
  if (days <= 3)
    return 'bg-fridgit-accentPale dark:bg-dracula-orange/20 text-fridgit-accent dark:text-dracula-orange';
  return 'bg-fridgit-primaryPale dark:bg-dracula-green/20 text-fridgit-primary dark:text-dracula-green';
}
