import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Search, Plus, Trash2, Edit3, ChevronRight } from 'lucide-react';
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

export default function FridgePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchItems = () => {
    api.get('/items').then(r => setItems(r.data)).catch(() => toast.error('Failed to load items')).finally(() => setLoading(false));
  };
  useEffect(() => { fetchItems(); }, []);

  const deleteItem = async (id) => {
    try {
      await api.delete(`/items/${id}`);
      setItems(items.filter(i => i.id !== id));
      toast.success('Item removed');
    } catch { toast.error('Failed to delete'); }
  };

  const consumeItem = async (id) => {
    try {
      const res = await api.post(`/items/${id}/consume`, { quantity: 1 });
      if (res.data.removed) {
        setItems(items.filter(i => i.id !== id));
      } else {
        setItems(items.map(i => i.id === id ? res.data.item : i));
      }
      toast.success('Item consumed!');
    } catch { toast.error('Failed to consume'); }
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
    if (days <= 0) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-fridgit-dangerPale text-fridgit-danger">Expired</span>;
    if (days <= 3) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-fridgit-accentPale text-fridgit-accent">{days}d left</span>;
    if (days <= 7) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-fridgit-primaryPale text-fridgit-primary">{days}d left</span>;
    return null;
  };

  return (
    <Layout>
      <div className="slide-up">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-serif text-fridgit-text">My Fridge</h1>
          <button onClick={() => navigate('/new-item')} className="w-10 h-10 rounded-xl bg-fridgit-primary text-white flex items-center justify-center hover:bg-fridgit-primaryLight transition-colors">
            <Plus size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fridgit-textMuted" />
          <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-fridgit-border bg-white text-fridgit-text placeholder:text-fridgit-textMuted focus:border-fridgit-primary focus:ring-1 focus:ring-fridgit-primary transition" />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat.key} onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                category === cat.key ? 'bg-fridgit-primary text-white' : 'bg-white text-fridgit-textMid border border-fridgit-border hover:bg-fridgit-primaryPale'
              }`}>
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="text-center py-12 text-fridgit-textMuted">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-fridgit-textMuted">No items found</p>
            <button onClick={() => navigate('/new-item')} className="mt-3 text-fridgit-primary font-semibold text-sm hover:underline">Add your first item</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-fridgit-border p-3 relative group">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-3xl">{item.emoji || '\u{1F4E6}'}</span>
                  {getExpiryBadge(item.expiry_date)}
                </div>
                <h3 className="font-medium text-fridgit-text text-sm truncate">{item.name}</h3>
                <p className="text-xs text-fridgit-textMuted mt-0.5">Qty: {item.quantity} {item.unit}</p>
                {item.calories ? <p className="text-xs text-fridgit-textMuted">{item.calories} kcal/100g</p> : null}
                <div className="flex gap-1 mt-2">
                  <button onClick={() => consumeItem(item.id)} className="flex-1 text-xs py-1.5 rounded-lg bg-fridgit-accentPale text-fridgit-accent font-medium hover:bg-fridgit-accent hover:text-white transition-colors">
                    Use
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="px-2 py-1.5 rounded-lg bg-fridgit-dangerPale text-fridgit-danger hover:bg-fridgit-danger hover:text-white transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
