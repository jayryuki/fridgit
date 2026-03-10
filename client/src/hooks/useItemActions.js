import { useState } from 'react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

/**
 * Shared hook for item-detail CRUD used by both Home and Fridge pages.
 *
 * @param {Object}   opts
 * @param {Array}    opts.items        - current items state
 * @param {Function} opts.setItems     - items setter
 * @param {Array}    [opts.expiring]   - expiring items state (Home only)
 * @param {Function} [opts.setExpiring]- expiring setter (Home only)
 *
 * @returns selected, editForm, saving, setEditForm, setSelected,
 *          openDetail, saveDetail, deleteItem, consumeItem, addToShoppingList
 */
export default function useItemActions({ items, setItems, expiring, setExpiring }) {
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // ── helpers to update both items AND expiring (when present) ──
  const replaceItem = (id, next) => {
    setItems((prev) => prev.map((i) => (i.id === id ? next : i)));
    if (setExpiring) setExpiring((prev) => prev.map((i) => (i.id === id ? next : i)));
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (setExpiring) setExpiring((prev) => prev.filter((i) => i.id !== id));
  };

  // ── public API ─────────────────────────────────────────────
  const openDetail = (item) => {
    setSelected(item);
    setEditForm({
      shared: item.shared || false,
      shared_with: item.shared_with || [],
      location: item.location || 'fridge',
      expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
    });
  };

  const saveDetail = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await api.put(`/items/${selected.id}`, editForm);
      replaceItem(selected.id, res.data);
      setSelected(res.data);
      toast.success('Item updated');
    } catch {
      toast.error('Failed to update');
    }
    setSaving(false);
  };

  const deleteItem = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/items/${id}`);
      removeItem(id);
      if (selected?.id === id) setSelected(null);
      toast.success('Item removed');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const consumeItem = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.post(`/items/${id}/consume`, { quantity: 1 });
      if (res.data.removed) {
        removeItem(id);
        if (selected?.id === id) setSelected(null);
      } else {
        replaceItem(id, res.data.item);
        if (selected?.id === id) {
          setSelected(res.data.item);
          setEditForm((prev) => ({ ...prev, quantity: res.data.item.quantity }));
        }
      }
      toast.success('Item consumed!');
    } catch {
      toast.error('Failed to consume');
    }
  };

  const addToShoppingList = async (item) => {
    try {
      await api.post('/shopping-list', { item_name: item.name });
      toast.success(`${item.name} added to shopping list`);
    } catch {
      toast.error('Failed to add to shopping list');
    }
  };

  return {
    selected,
    setSelected,
    editForm,
    setEditForm,
    saving,
    openDetail,
    saveDetail,
    deleteItem,
    consumeItem,
    addToShoppingList,
  };
}
