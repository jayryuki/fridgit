import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import ItemDetailModal from '../components/ItemDetailModal.jsx';
import { Search, Plus, Trash2 } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';

function r2(val) {
  const n = parseFloat(val);
  if (val == null || val === '' || isNaN(n)) return '-';
  return String(Math.round(n * 100) / 100);
}
function hasNutrition(v) {
  return v != null && v !== '' && v !== false;
}

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

export default function FridgePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchItems = () => {
    api
      .get('/items')
      .then((r) => setItems(r.data))
      .catch(() => toast.error('Failed to load items'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchItems();
  }, []);

  const deleteItem = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/items/${id}`);
      setItems(items.filter((i) => i.id !== id));
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
        setItems(items.filter((i) => i.id !== id));
        if (selected?.id === id) setSelected(null);
      } else {
        setItems(items.map((i) => (i.id === id ? res.data.item : i)));
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
      setItems(items.map((i) => (i.id === selected.id ? res.data : i)));
      setSelected(res.data);
      toast.success('Item updated');
    } catch {
      toast.error('Failed to update');
    }
    setSaving(false);
  };

  const addToShoppingList = async (item) => {
    try {
      await api.post('/shopping-list', { item_name: item.name });
      toast.success(`${item.name} added to shopping list`);
    } catch {
      toast.error('Failed to add to shopping list');
    }
  };

  const filtered = items.filter((item) => {
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
    if (days <= 0) return <span className="rounded-md bg-fridgit-dangerPale px-1.5 py-0.5 text-[10px] font-bold text-fridgit-danger dark:bg-dracula-red/20 dark:text-dracula-red">Expired</span>;
    if (days <= 3) return <span className="rounded-md bg-fridgit-accentPale px-1.5 py-0.5 text-[10px] font-bold text-fridgit-accent dark:bg-dracula-orange/20 dark:text-dracula-orange">{days}d left</span>;
    if (days <= 7) return <span className="rounded-md bg-fridgit-primaryPale px-1.5 py-0.5 text-[10px] font-bold text-fridgit-primary dark:bg-dracula-green/20 dark:text-dracula-green">{days}d left</span>;
    return null;
  };

  return (
    <Layout>
      <div className="page-stack slide-up">
        <section className="hero-card">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-serif text-fridgit-text dark:text-dracula-fg sm:text-[2rem]">My Fridge</h1>
              <p className="mt-2 text-sm text-fridgit-textMuted dark:text-dracula-comment sm:text-base">
                Search, filter, and manage your inventory comfortably on desktop or mobile.
              </p>
            </div>
            <button
              onClick={() => navigate('/new-item')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-fridgit-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-fridgit-primaryLight dark:bg-dracula-green dark:text-dracula-bg dark:hover:bg-dracula-green/80"
            >
              <Plus size={18} />
              Add item
            </button>
          </div>
        </section>

        <section className="panel-section">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fridgit-textMuted dark:text-dracula-comment" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-fridgit-border bg-white py-3 pl-10 pr-4 text-fridgit-text transition placeholder:text-fridgit-textMuted focus:border-fridgit-primary focus:ring-1 focus:ring-fridgit-primary dark:border-dracula-line dark:bg-dracula-surface dark:text-dracula-fg dark:placeholder:text-dracula-comment dark:focus:border-dracula-green dark:focus:ring-dracula-green"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:max-w-[540px] lg:justify-end">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    category === cat.key
                      ? 'bg-fridgit-primary text-white dark:bg-dracula-green dark:text-dracula-bg'
                      : 'border border-fridgit-border bg-white text-fridgit-textMid hover:bg-fridgit-primaryPale dark:border-dracula-line dark:bg-dracula-surface dark:text-dracula-fg dark:hover:bg-dracula-green/10'
                  }`}
                >
                  <span className="mr-1.5">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          {loading ? (
            <div className="py-16 text-center text-fridgit-textMuted dark:text-dracula-comment">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="panel-section text-center">
              <p className="text-fridgit-textMuted dark:text-dracula-comment">No items found</p>
              <button onClick={() => navigate('/new-item')} className="mt-3 text-sm font-semibold text-fridgit-primary hover:underline dark:text-dracula-green">
                Add your first item
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openDetail(item)}
                  className="group cursor-pointer rounded-2xl border border-fridgit-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-dracula-line dark:bg-dracula-surface dark:hover:border-dracula-purple/50"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-16 w-16 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-fridgit-surfaceAlt text-3xl dark:bg-dracula-bg">{item.emoji || '\u{1F4E6}'}</span>
                    )}
                    {getExpiryBadge(item.expiry_date)}
                  </div>
                  <h3 className="truncate text-base font-semibold text-fridgit-text dark:text-dracula-fg">{item.name}</h3>
                  <p className="mt-1 text-sm text-fridgit-textMuted dark:text-dracula-comment">Qty: {item.quantity} {item.unit}</p>
                  {hasNutrition(item.calories) ? <p className="text-sm text-fridgit-textMuted dark:text-dracula-comment">{r2(item.calories)} kcal/100g</p> : null}
                  <div className="mt-4 flex gap-2">
                    <button onClick={(e) => consumeItem(item.id, e)} className="flex-1 rounded-lg bg-fridgit-accentPale px-3 py-2 text-sm font-medium text-fridgit-accent transition-colors hover:bg-fridgit-accent hover:text-white dark:bg-dracula-orange/20 dark:text-dracula-orange dark:hover:bg-dracula-orange dark:hover:text-dracula-bg">
                      Use
                    </button>
                    <button onClick={(e) => deleteItem(item.id, e)} className="rounded-lg bg-fridgit-dangerPale px-3 py-2 text-fridgit-danger transition-colors hover:bg-fridgit-danger hover:text-white dark:bg-dracula-red/20 dark:text-dracula-red dark:hover:bg-dracula-red dark:hover:text-dracula-bg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ItemDetailModal
        selected={selected}
        editForm={editForm}
        saving={saving}
        user={user}
        onClose={() => setSelected(null)}
        onSave={saveDetail}
        onConsume={consumeItem}
        onDelete={deleteItem}
        onAddToShoppingList={addToShoppingList}
        onEditFormChange={setEditForm}
      />
    </Layout>
  );
}
