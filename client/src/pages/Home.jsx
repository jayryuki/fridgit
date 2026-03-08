import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Layout from '../components/Layout.jsx';
import { Plus, AlertTriangle, Package, Clock, Trash2, X, Save, Loader2, Users, Globe } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import SharePicker from '../components/SharePicker.jsx';

const locationOptions = ['fridge', 'freezer', 'pantry', 'counter'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/items').then(r => r.data),
      api.get('/items/expiring?days=7').then(r => r.data),
    ]).then(([allItems, expiringItems]) => {
      setItems(allItems);
      setExpiring(expiringItems);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getDaysUntilExpiry = (date) => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getExpiryColor = (days) => {
    if (days <= 1) return 'bg-fridgit-dangerPale dark:bg-dracula-red/20 text-fridgit-danger dark:text-dracula-red';
    if (days <= 3) return 'bg-fridgit-accentPale dark:bg-dracula-orange/20 text-fridgit-accent dark:text-dracula-orange';
    return 'bg-fridgit-primaryPale dark:bg-dracula-green/20 text-fridgit-primary dark:text-dracula-green';
  };

  /* -- Detail card handlers (mirrors Fridge.jsx) -- */

  const openDetail = async (item) => {
    setSelected(item);
    setEditForm({
      shared: item.shared || false,
      location: item.location || 'fridge',
      expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
      shared_with: [],
    });
    try {
      const res = await api.get(`/items/${item.id}/shares`);
      setEditForm(prev => ({ ...prev, shared_with: res.data }));
    } catch {}
  };

  const saveDetail = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await api.put(`/items/${selected.id}`, {
        ...editForm,
        shared_with: editForm.shared_with,
      });
      setItems(items.map(i => i.id === selected.id ? res.data : i));
      setExpiring(expiring.map(i => i.id === selected.id ? res.data : i));
      setSelected(res.data);
      toast.success('Item updated');
    } catch { toast.error('Failed to update'); }
    setSaving(false);
  };

  const consumeItem = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.post(`/items/${id}/consume`, { quantity: 1 });
      if (res.data.removed) {
        setItems(items.filter(i => i.id !== id));
        setExpiring(expiring.filter(i => i.id !== id));
        if (selected?.id === id) setSelected(null);
      } else {
        setItems(items.map(i => i.id === id ? res.data.item : i));
        setExpiring(expiring.map(i => i.id === id ? res.data.item : i));
        if (selected?.id === id) {
          setSelected(res.data.item);
          setEditForm(prev => ({ ...prev, quantity: res.data.item.quantity }));
        }
      }
      toast.success('Item consumed!');
    } catch { toast.error('Failed to consume'); }
  };

  const deleteItem = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/items/${id}`);
      setItems(items.filter(i => i.id !== id));
      setExpiring(expiring.filter(i => i.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success('Item removed');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <Layout>
      <div className="slide-up">
        <div className="mb-6">
          <h1 className="text-2xl font-serif text-fridgit-text dark:text-dracula-fg">{getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!</h1>
          <p className="text-fridgit-textMuted dark:text-dracula-comment text-sm mt-1">Here's what's in your fridge</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white dark:bg-dracula-surface rounded-xl p-3 border border-fridgit-border dark:border-dracula-line text-center">
            <Package size={20} className="text-fridgit-primary dark:text-dracula-green mx-auto mb-1" />
            <div className="text-xl font-bold text-fridgit-text dark:text-dracula-fg">{items.length}</div>
            <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment">Items</div>
          </div>
          <div className="bg-white dark:bg-dracula-surface rounded-xl p-3 border border-fridgit-border dark:border-dracula-line text-center">
            <AlertTriangle size={20} className="text-fridgit-accent dark:text-dracula-orange mx-auto mb-1" />
            <div className="text-xl font-bold text-fridgit-text dark:text-dracula-fg">{expiring.length}</div>
            <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment">Expiring</div>
          </div>
          <div className="bg-white dark:bg-dracula-surface rounded-xl p-3 border border-fridgit-border dark:border-dracula-line text-center">
            <Clock size={20} className="text-fridgit-textMuted dark:text-dracula-comment mx-auto mb-1" />
            <div className="text-xl font-bold text-fridgit-text dark:text-dracula-fg">{items.filter(i => !i.expiry_date).length}</div>
            <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment">No Date</div>
          </div>
        </div>

        {/* Expiring Soon */}
        {expiring.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-serif text-fridgit-text dark:text-dracula-fg mb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-fridgit-accent dark:text-dracula-orange" />
              Needs Attention
            </h2>
            <div className="space-y-2">
              {expiring.slice(0, 5).map(item => {
                const days = getDaysUntilExpiry(item.expiry_date);
                return (
                  <div key={item.id} onClick={() => openDetail(item)} className="bg-white dark:bg-dracula-surface rounded-xl p-3 border border-fridgit-border dark:border-dracula-line flex items-center gap-3 cursor-pointer">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <span className="text-2xl">{item.emoji || '\u{1F4E6}'}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-fridgit-text dark:text-dracula-fg truncate">{item.name}</div>
                      <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment">Qty: {item.quantity}</div>
                    </div>
                    <span className={`relative z-10 text-xs font-semibold px-2 py-1 rounded-lg ${getExpiryColor(days)}`}>
                      {days <= 0 ? 'Expired' : days === 1 ? '1 day' : `${days} days`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="bg-white dark:bg-dracula-surface rounded-2xl border border-fridgit-border dark:border-dracula-line p-8 text-center">
            <Package size={48} className="text-fridgit-textMuted dark:text-dracula-comment mx-auto mb-3" />
            <h3 className="text-lg font-serif text-fridgit-text dark:text-dracula-fg mb-1">Your fridge is empty</h3>
            <p className="text-sm text-fridgit-textMuted dark:text-dracula-comment mb-4">Add your first item to get started</p>
            <button onClick={() => navigate('/new-item')} className="bg-fridgit-primary dark:bg-dracula-green text-white dark:text-dracula-bg px-6 py-2.5 rounded-xl font-semibold hover:bg-fridgit-primaryLight dark:hover:bg-dracula-green/80 transition-colors">
              Add Item
            </button>
          </div>
        )}

        {/* FAB Button */}
        <div className="fixed bottom-24 right-4 flex flex-col gap-3 max-w-lg">
          <button onClick={() => navigate('/new-item')}
            className="w-14 h-14 rounded-full bg-fridgit-primary dark:bg-dracula-green text-white dark:text-dracula-bg shadow-lg hover:bg-fridgit-primaryLight dark:hover:bg-dracula-green/80 transition-colors flex items-center justify-center">
            <Plus size={28} />
          </button>
        </div>
      </div>

      {/* Item Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
          <div className="relative w-full max-w-lg bg-white dark:bg-dracula-currentLine rounded-t-2xl p-5 pb-8 slide-up max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif text-fridgit-text dark:text-dracula-fg">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-fridgit-surfaceAlt dark:hover:bg-dracula-surface transition-colors">
                <X size={20} className="text-fridgit-textMuted dark:text-dracula-comment" />
              </button>
            </div>

            {/* Image or emoji */}
            <div className="flex justify-center mb-4">
              {selected.image_url ? (
                <img src={selected.image_url} alt={selected.name} className="w-32 h-32 rounded-xl object-cover border border-fridgit-border dark:border-dracula-line" />
              ) : (
                <div className="w-32 h-32 rounded-xl bg-fridgit-surfaceAlt dark:bg-dracula-surface flex items-center justify-center">
                  <span className="text-6xl">{selected.emoji || '\u{1F4E6}'}</span>
                </div>
              )}
            </div>

            {/* Nutrition */}
            {(selected.calories || selected.protein || selected.carbs || selected.fat) && (
              <div className="bg-fridgit-bg dark:bg-dracula-bg rounded-xl p-3 mb-4">
                <h3 className="text-xs font-semibold text-fridgit-textMuted dark:text-dracula-comment mb-2 uppercase tracking-wide">Nutrition (per 100g)</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-fridgit-text dark:text-dracula-fg">{selected.calories ? Math.round(Number(selected.calories)) : '-'}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">kcal</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-fridgit-primary dark:text-dracula-green">{selected.protein || '-'}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Protein</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-fridgit-accent dark:text-dracula-orange">{selected.carbs || '-'}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Carbs</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-fridgit-danger dark:text-dracula-red">{selected.fat || '-'}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Fat</div>
                  </div>
                </div>
              </div>
            )}

            {/* Info row */}
            <div className="flex items-center gap-3 text-sm text-fridgit-textMid dark:text-dracula-fg mb-4">
              <span className="bg-fridgit-primaryPale dark:bg-dracula-green/20 text-fridgit-primary dark:text-dracula-green px-2 py-0.5 rounded-md text-xs font-semibold capitalize">{selected.category}</span>
              <span>Qty: {selected.quantity} {selected.unit}</span>
            </div>

            {/* Editable fields */}
            <div className="space-y-3 mb-4">
              {/* Sharing */}
              <SharePicker
                shared={editForm.shared}
                sharedWith={editForm.shared_with || []}
                currentUserId={user?.id}
                onChange={({ shared, sharedWith }) => setEditForm(prev => ({ ...prev, shared, shared_with: sharedWith }))}
              />

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Location</label>
                <select value={editForm.location} onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg capitalize">
                  {locationOptions.map(loc => <option key={loc} value={loc} className="capitalize">{loc}</option>)}
                </select>
              </div>

              {/* Expiry date */}
              <div>
                <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Expiry Date</label>
                <input type="date" value={editForm.expiry_date} onChange={e => setEditForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg focus:border-fridgit-primary dark:focus:border-dracula-green transition" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-3">
              <button onClick={(e) => consumeItem(selected.id, e)}
                className="flex-1 py-2.5 rounded-xl bg-fridgit-accentPale dark:bg-dracula-orange/20 text-fridgit-accent dark:text-dracula-orange font-semibold hover:bg-fridgit-accent hover:text-white dark:hover:bg-dracula-orange dark:hover:text-dracula-bg transition-colors">
                Use 1
              </button>
              <button onClick={(e) => deleteItem(selected.id, e)}
                className="px-4 py-2.5 rounded-xl bg-fridgit-dangerPale dark:bg-dracula-red/20 text-fridgit-danger dark:text-dracula-red hover:bg-fridgit-danger hover:text-white dark:hover:bg-dracula-red dark:hover:text-dracula-bg transition-colors">
                <Trash2 size={18} />
              </button>
            </div>

            {/* Save */}
            <button onClick={saveDetail} disabled={saving}
              className="w-full py-3 rounded-xl bg-fridgit-primary dark:bg-dracula-green text-white dark:text-dracula-bg font-semibold hover:bg-fridgit-primaryLight dark:hover:bg-dracula-green/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
