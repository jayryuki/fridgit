import { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import { Plus, Trash2, Check, RefreshCw, ShoppingCart, Loader2 } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function ShoppingList() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchItems = () => {
    api.get('/shopping-list').then(r => setItems(r.data)).catch(() => toast.error('Failed to load list')).finally(() => setLoading(false));
  };
  useEffect(() => { fetchItems(); }, []);

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    try {
      const res = await api.post('/shopping-list', { item_name: newItem.trim() });
      setItems([res.data, ...items]);
      setNewItem('');
    } catch { toast.error('Failed to add'); }
  };

  const togglePurchased = async (item) => {
    try {
      const res = await api.put(`/shopping-list/${item.id}`, { purchased: !item.purchased });
      setItems(items.map(i => i.id === item.id ? res.data : i));
    } catch { toast.error('Failed to update'); }
  };

  const deleteItem = async (id) => {
    try {
      await api.delete(`/shopping-list/${id}`);
      setItems(items.filter(i => i.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const clearPurchased = async () => {
    try {
      await api.delete('/shopping-list');
      setItems(items.filter(i => !i.purchased));
      toast.success('Cleared purchased items');
    } catch { toast.error('Failed to clear'); }
  };

  const autoGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/shopping-list/auto-generate');
      if (res.data.length > 0) {
        setItems([...res.data, ...items]);
        toast.success(`Added ${res.data.length} items from expiring inventory`);
      } else {
        toast('No items to add - your fridge is well stocked!');
      }
    } catch { toast.error('Failed to auto-generate'); }
    setGenerating(false);
  };

  const unpurchased = items.filter(i => !i.purchased);
  const purchased = items.filter(i => i.purchased);

  return (
    <Layout>
      <div className="slide-up">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-serif text-fridgit-text">Shopping List</h1>
          <button onClick={autoGenerate} disabled={generating} title="Auto-add expiring items"
            className="p-2 rounded-xl bg-fridgit-accentPale text-fridgit-accent hover:bg-fridgit-accent hover:text-white transition-colors disabled:opacity-50">
            {generating ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
          </button>
        </div>

        {/* Add item */}
        <form onSubmit={addItem} className="flex gap-2 mb-6">
          <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add an item..."
            className="flex-1 px-3 py-2.5 rounded-xl border border-fridgit-border bg-white text-fridgit-text placeholder:text-fridgit-textMuted focus:border-fridgit-primary transition" />
          <button type="submit" className="px-4 py-2.5 rounded-xl bg-fridgit-primary text-white hover:bg-fridgit-primaryLight transition-colors">
            <Plus size={20} />
          </button>
        </form>

        {loading ? (
          <div className="text-center py-12 text-fridgit-textMuted">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart size={48} className="text-fridgit-textMuted mx-auto mb-3" />
            <p className="text-fridgit-textMuted">Your shopping list is empty</p>
            <button onClick={autoGenerate} className="mt-3 text-fridgit-primary font-semibold text-sm hover:underline">Auto-generate from inventory</button>
          </div>
        ) : (
          <>
            {/* Unpurchased */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {unpurchased.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-fridgit-border p-3 flex items-center gap-3">
                  <button onClick={() => togglePurchased(item)} className="w-6 h-6 rounded-full border-2 border-fridgit-border hover:border-fridgit-primary transition-colors flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-fridgit-text font-medium text-sm">{item.item_name}</span>
                    {item.quantity > 1 && <span className="text-xs text-fridgit-textMuted ml-2">x{item.quantity}</span>}
                    {item.auto_generated && <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-fridgit-accentPale text-fridgit-accent font-medium">auto</span>}
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="p-1 text-fridgit-textMuted hover:text-fridgit-danger transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Purchased */}
            {purchased.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-fridgit-textMuted">Purchased ({purchased.length})</h3>
                  <button onClick={clearPurchased} className="text-xs text-fridgit-danger font-medium hover:underline">Clear all</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {purchased.map(item => (
                    <div key={item.id} className="bg-fridgit-surfaceAlt rounded-xl border border-fridgit-border p-3 flex items-center gap-3 opacity-60">
                      <button onClick={() => togglePurchased(item)} className="w-6 h-6 rounded-full bg-fridgit-primary flex items-center justify-center flex-shrink-0">
                        <Check size={14} className="text-white" />
                      </button>
                      <span className="text-fridgit-textMuted font-medium text-sm line-through flex-1">{item.item_name}</span>
                      <button onClick={() => deleteItem(item.id)} className="p-1 text-fridgit-textMuted hover:text-fridgit-danger transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}