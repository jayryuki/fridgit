import { X, Save, Loader2, Trash2, ShoppingCart } from 'lucide-react';
import SharePicker from './SharePicker.jsx';
import { locationOptions } from '../utils/constants.js';
import { r2, hasNutrition } from '../utils/helpers.js';

export default function ItemDetailModal({
  selected,
  editForm,
  saving,
  user,
  onClose,
  onSave,
  onConsume,
  onDelete,
  onAddToShoppingList,
  onEditFormChange,
}) {
  if (!selected) return null;

  const handleFieldChange = (field, value) => {
    onEditFormChange((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="desktop-modal" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      <div
        className="desktop-modal-card slide-up flex max-h-[85vh] max-h-[85dvh] flex-col sm:max-h-[90vh] sm:max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed header */}
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-serif text-fridgit-text dark:text-dracula-fg">
            {selected.name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-fridgit-surfaceAlt dark:hover:bg-dracula-surface"
          >
            <X size={20} className="text-fridgit-textMuted dark:text-dracula-comment" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-safe">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
            {/* Image / emoji */}
            <div className="flex justify-center lg:justify-start">
              {selected.image_url ? (
                <img
                  src={selected.image_url}
                  alt={selected.name}
                  className="h-40 w-40 rounded-2xl border border-fridgit-border object-cover dark:border-dracula-line lg:h-52 lg:w-52"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-fridgit-surfaceAlt dark:bg-dracula-surface lg:h-52 lg:w-52">
                  <span className="text-7xl">{selected.emoji || '\u{1F4E6}'}</span>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {/* Nutrition */}
              {(hasNutrition(selected.calories) ||
                hasNutrition(selected.protein) ||
                hasNutrition(selected.carbs) ||
                hasNutrition(selected.fat)) && (
                <div className="rounded-2xl bg-fridgit-bg p-4 dark:bg-dracula-bg">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fridgit-textMuted dark:text-dracula-comment">
                    Nutrition (per 100g)
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                    <div>
                      <div className="text-lg font-bold text-fridgit-text dark:text-dracula-fg">
                        {r2(selected.calories)}
                      </div>
                      <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">
                        kcal
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-fridgit-primary dark:text-dracula-green">
                        {r2(selected.protein)}
                      </div>
                      <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">
                        Protein
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-fridgit-accent dark:text-dracula-orange">
                        {r2(selected.carbs)}
                      </div>
                      <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">
                        Carbs
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-fridgit-danger dark:text-dracula-red">
                        {r2(selected.fat)}
                      </div>
                      <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">
                        Fat
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category + quantity */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-fridgit-textMid dark:text-dracula-fg">
                <span className="rounded-md bg-fridgit-primaryPale px-2 py-0.5 text-xs font-semibold capitalize text-fridgit-primary dark:bg-dracula-green/20 dark:text-dracula-green">
                  {selected.category}
                </span>
                <span>
                  Qty: {selected.quantity} {selected.unit}
                </span>
              </div>

              {/* Location + expiry fields */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">
                    Location
                  </label>
                  <select
                    value={editForm.location}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    className="w-full rounded-xl border border-fridgit-border bg-fridgit-bg px-3 py-2.5 capitalize text-fridgit-text dark:border-dracula-line dark:bg-dracula-bg dark:text-dracula-fg"
                  >
                    {locationOptions.map((loc) => (
                      <option key={loc} value={loc} className="capitalize">
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editForm.expiry_date}
                    onChange={(e) => handleFieldChange('expiry_date', e.target.value)}
                    className="w-full rounded-xl border border-fridgit-border bg-fridgit-bg px-3 py-2.5 text-fridgit-text transition focus:border-fridgit-primary dark:border-dracula-line dark:bg-dracula-bg dark:text-dracula-fg dark:focus:border-dracula-green"
                  />
                </div>
              </div>

              {/* Share picker */}
              <div className="rounded-2xl border border-fridgit-border bg-fridgit-bg p-4 dark:border-dracula-line dark:bg-dracula-bg">
                <SharePicker
                  shared={editForm.shared}
                  sharedWith={editForm.shared_with || []}
                  currentUserId={user?.id}
                  onChange={({ shared, sharedWith }) =>
                    onEditFormChange((prev) => ({
                      ...prev,
                      shared,
                      shared_with: sharedWith,
                    }))
                  }
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pb-2">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-fridgit-primary py-3 font-semibold text-white transition-colors hover:bg-fridgit-primaryLight disabled:opacity-50 dark:bg-dracula-green dark:text-dracula-bg dark:hover:bg-dracula-green/80"
                >
                  {saving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Save Changes
                </button>
                <button
                  onClick={() => onAddToShoppingList(selected)}
                  className="rounded-xl bg-fridgit-primaryPale px-4 py-3 text-fridgit-primary transition-colors hover:bg-fridgit-primary hover:text-white dark:bg-dracula-green/20 dark:text-dracula-green dark:hover:bg-dracula-green dark:hover:text-dracula-bg"
                  title="Add to shopping list"
                >
                  <ShoppingCart size={18} />
                </button>
                <button
                  onClick={(e) => onConsume(selected.id, e)}
                  className="rounded-xl bg-fridgit-accentPale px-4 py-3 font-semibold text-fridgit-accent transition-colors hover:bg-fridgit-accent hover:text-white dark:bg-dracula-orange/20 dark:text-dracula-orange dark:hover:bg-dracula-orange dark:hover:text-dracula-bg"
                >
                  Use
                </button>
                <button
                  onClick={(e) => onDelete(selected.id, e)}
                  className="rounded-xl bg-fridgit-dangerPale px-4 py-3 text-fridgit-danger transition-colors hover:bg-fridgit-danger hover:text-white dark:bg-dracula-red/20 dark:text-dracula-red dark:hover:bg-dracula-red dark:hover:text-dracula-bg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
