import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Search, Plus, Trash2, X, Save, Loader2 } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

const categories = [
  { key: 'all', label: 'All', emoji: '\u{1F3E0}' },
  { key: 'dairy', label: 'Dairy', emoji: '\u{1F95B}' },
  { key: 'meat', label: 'Meat', emoji: '\u{1F357}' },
  { key: 'vegetables', label: 'Veggies', emoji: '\u{1F96C}' },
  { key: 'fruits', label: 'Fruits', emoji: '\u{1F34E}' },
  { key: 'beverages', label: 'Drinks', emoji: '\u{1F964}' },
  { key: 'condiments', label: 'Sauces', emoji: '\u{1FAD9}' },
  { key: 'grains', label: 'Grains', emoji: '\u{1F33E}' },
  { key: 'snacks', label: 'Snacks', emoji: '\u{1F36A}' },
  { key: 'other', label: 'Other', emoji: '\u{1F4E6}' },
];

const locationOptions = ['fridge', 'freezer', 'pantry', 'counter'];

export default function FridgePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchItems = () => {
    api.get('/items').then(r => setItems(r.data)).catch(() => toast.error('Failed to load items')).finally(() => setLoading(false));
  };
  useEffect(() => { fetchItems(); }, []);

  const deleteItem = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/items/${id}`);
      setItems(items.filter(i => i.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success('Item removed');
    } catch { toast.error('Failed to delete'); }
  };

  const consumeItem = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.post(`/items/${id}/consume`, { quantity: 1 });
      if (res.data.removed) {
        setItems(items.filter(i => i.id !== id));
        if (selected?.id === id) setSelected(null);
      } else {
        setItems(items.map(i => i.id === id ? res.data.item : i));
        if (selected?.id === id) {
          setSelected(res.data.item);
          setEditForm(prev => ({ ...prev, quantity: res.data.item.quantity }));
        }
      }
      toast.success('Item consumed!');
    } catch { toast.error('Failed to consume'); }
  };

  const openDetail = (item) => {
    setSelected(item);
    setEditForm({
      shared: item.shared || false,
      location: item.location || 'fridge',
      expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
    });
  };

  const saveDetail = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await api.put(`/items/${selected.id}`, editForm);
      setItems(items.map(i => i.id === selected.id ? res.data : i));
      setSelected(res.data);
      toast.success('Item updated');
    } catch { toast.error('Failed to update'); }
    setSaving(false);
  };

  const filtered = items.filter(item => {
    const matchCat = category === 'all' || item.category === category;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const getDaysUntilExpiry = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryBadge = (date) => {
    const days = getDaysUntilExpiry(date);
    if (days === null) return null;
    if (days <= 0) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-fridgit-dangerPale dark:bg-dracula-red/20 text-fridgit-danger dark:text-dracula-red">Expired</span>;
    if (days <= 3) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-fridgit-accentPale dark:bg-dracula-orange/20 text-fridgit-accent dark:text-dracula-orange">{days}d left</span>;
    if (days <= 7) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-fridgit-primaryPale dark:bg-dracula-green/20 text-fridgit-primary dark:text-dracula-green">{days}d left</span>;
    return null;
  };

  return (
    <Layout>
      <div className="slide-up">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-serif text-fridgit-text dark:text-dracula-fg">My Fridge</h1>
          <button onClick={() => navigate('/new-item')} className="w-10 h-10 rounded-xl bg-fridgit-primary dark:bg-dracula-green text-white dark:text-dracula-bg flex items-center justify-center hover:bg-fridgit-primaryLight dark:hover:bg-dracula-green/80 transition-colors">
            <Plus size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fridgit-textMuted dark:text-dracula-comment" />
          <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-white dark:bg-dracula-surface text-fridgit-text dark:text-dracula-fg placeholder:text-fridgit-textMuted dark:placeholder:text-dracula-comment focus:border-fridgit-primary dark:focus:border-dracula-green focus:ring-1 focus:ring-fridgit-primary dark:focus:ring-dracula-green transition" />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat.key} onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                category === cat.key
                  ? 'bg-fridgit-primary dark:bg-dracula-green text-white dark:text-dracula-bg'
                  : 'bg-white dark:bg-dracula-surface text-fridgit-textMid dark:text-dracula-fg border border-fridgit-border dark:border-dracula-line hover:bg-fridgit-primaryPale dark:hover:bg-dracula-green/10'
              }`}>
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="text-center py-12 text-fridgit-textMuted dark:text-dracula-comment">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-fridgit-textMuted dark:text-dracula-comment">No items found</p>
            <button onClick={() => navigate('/new-item')} className="mt-3 text-fridgit-primary dark:text-dracula-green font-semibold text-sm hover:underline">Add your first item</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(item => (
              <div key={item.id} onClick={() => openDetail(item)}
                className="bg-white dark:bg-dracula-surface rounded-xl border border-fridgit-border dark:border-dracula-line p-3 relative group cursor-pointer hover:shadow-md dark:hover:border-dracula-purple/50 transition-all">
                <div className="flex items-start justify-between mb-2">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <span className="text-3xl">{item.emoji || '\u{1F4E6}'}</span>
                  )}
                  {getExpiryBadge(item.expiry_date)}
                </div>
                <h3 className="font-medium text-fridgit-text dark:text-dracula-fg text-sm truncate">{item.name}</h3>
                <p className="text-xs text-fridgit-textMuted dark:text-dracula-comment mt-0.5">Qty: {item.quantity} {item.unit}</p>
                {item.calories ? <p className="text-xs text-fridgit-textMuted dark:text-dracula-comment">{Math.round(Number(item.calories))} kcal/100g</p> : null}
                <div className="flex gap-1 mt-2">
                  <button onClick={(e) => consumeItem(item.id, e)} className="flex-1 text-xs py-1.5 rounded-lg bg-fridgit-accentPale dark:bg-dracula-orange/20 text-fridgit-accent dark:text-dracula-orange font-medium hover:bg-fridgit-accent hover:text-white dark:hover:bg-dracula-orange dark:hover:text-dracula-bg transition-colors">
                    Use
                  </button>
                  <button onClick={(e) => deleteItem(item.id, e)} className="px-2 py-1.5 rounded-lg bg-fridgit-dangerPale dark:bg-dracula-red/20 text-fridgit-danger dark:text-dracula-red hover:bg-fridgit-danger hover:text-white dark:hover:bg-dracula-red dark:hover:text-dracula-bg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
              {/* Shared toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">Shared with household</span>
                <button type="button" onClick={() => setEditForm(prev => ({ ...prev, shared: !prev.shared }))}
                  className={`w-12 h-6 rounded-full transition-colors ${editForm.shared ? 'bg-fridgit-primary dark:bg-dracula-green' : 'bg-fridgit-border dark:bg-dracula-line'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${editForm.shared ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

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
