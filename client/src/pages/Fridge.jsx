import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Plus, Search, Trash2, Minus, ChevronDown, Loader2 } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

const categories = [
  { key: 'all', label: 'All' },
  { key: 'dairy', emoji: '🥛', label: 'Dairy' },
  { key: 'meat', emoji: '🍗', label: 'Meat' },
  { key: 'vegetables', emoji: '🥬', label: 'Veggies' },
  { key: 'fruits', emoji: '🍎', label: 'Fruits' },
  { key: 'beverages', emoji: '🥤', label: 'Drinks' },
  { key: 'condiments', emoji: '🫙', label: 'Sauces' },
  { key: 'grains', emoji: '🌾', label: 'Grains' },
  { key: 'snacks', emoji: '🍪', label: 'Snacks' },
  { key: 'other', emoji: '📦', label: 'Other' },
];

export default function FridgePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [consuming, setConsuming] = useState(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = () => {
    api.get('/items').then(r => setItems(r.data)).catch(() => toast.error('Failed to load items')).finally(() => setLoading(false));
  };

  const consumeItem = async (id) => {
    setConsuming(id);
    try {
      const res = await api.post(`/items/${id}/consume`, { quantity: 1 });
      if (res.data.removed) {
        setItems(prev => prev.filter(i => i.id !== id));
        toast.success('Item consumed and removed');
      } else {
        setItems(prev => prev.map(i => i.id === id ? res.data.item : i));
        toast.success('Item consumed');
      }
    } catch { toast.error('Failed to consume'); }
    setConsuming(null);
  };

  const deleteItem = async (id) => {
    try {
      await api.delete(`/items/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Item deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = items.filter(item => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getExpiryBadge = (date) => {
    if (!date) return null;
    const days = Math.ceil((new Date(date) - new Date()) / (1000*60*60*24));
    if (days <= 0) return { text: 'Expired', cls: 'bg-fridgit-dangerPale text-fridgit-danger' };
    if (days <= 2) return { text: `${days}d left`, cls: 'bg-fridgit-accentPale text-fridgit-accent' };
    if (days <= 7) return { text: `${days}d left`, cls: 'bg-fridgit-primaryPale text-fridgit-primary' };
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
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fridgit-textMuted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-fridgit-border bg-white text-fridgit-text focus:border-fridgit-primary transition" />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat.key ? 'bg-fridgit-primary text-white' : 'bg-fridgit-surfaceAlt text-fridgit-textMid hover:bg-fridgit-primaryPale'
              }`}>
              {cat.emoji ? `${cat.emoji} ` : ''}{cat.label}
            </button>
          ))}
        </div>

        {/* Items */}
        {loading ? (
          <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-fridgit-primary mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-fridgit-textMuted text-sm">{items.length === 0 ? 'Your fridge is empty. Add some items!' : 'No items match your filters.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const badge = getExpiryBadge(item.expiry_date);
              return (
                <div key={item.id} className="bg-white rounded-xl border border-fridgit-border p-3 flex items-center gap-3">
                  <span className="text-2xl flex-shrink-0">{item.emoji || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fridgit-text text-sm truncate">{item.name}</span>
                      {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.cls}`}>{badge.text}</span>}
                    </div>
                    <div className="text-xs text-fridgit-textMuted mt-0.5">
                      {item.quantity} {item.unit} &middot; {item.location} {item.shared ? '&middot; shared' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => consumeItem(item.id)} disabled={consuming === item.id}
                      className="w-8 h-8 rounded-lg bg-fridgit-primaryPale text-fridgit-primary flex items-center justify-center hover:bg-fridgit-primary hover:text-white transition-colors">
                      {consuming === item.id ? <Loader2 size={14} className="animate-spin" /> : <Minus size={14} />}
                    </button>
                    <button onClick={() => deleteItem(item.id)}
                      className="w-8 h-8 rounded-lg bg-fridgit-dangerPale text-fridgit-danger flex items-center justify-center hover:bg-fridgit-danger hover:text-white transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}