import { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import { Plus, Trash2, Check, RefreshCw, Loader2 } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function ShoppingList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = () => {
    api.get('/shopping-list').then(r => setItems(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      const res = await api.post('/shopping-list', { item_name: newItem.trim() });
      setItems(prev => [res.data, ...prev]);
      setNewItem('');
      toast.success('Added!');
    } catch { toast.error('Failed to add'); }
    setAdding(false);
  };

  const togglePurchased = async (id, current) => {
    try {
      const res = await api.put(`/shopping-list/${id}`, { purchased: !current });
      setItems(prev => prev.map(i => i.id === id ? res.data : i));
    } catch { toast.error('Failed to update'); }
  };

  const deleteItem = async (id) => {
    try {
      await api.delete(`/shopping-list/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const clearPurchased = async () => {
    try {
      await api.delete('/shopping-list');
      setItems(prev => prev.filter(i => !i.purchased));
      toast.success('Cleared purchased items');
    } catch { toast.error('Failed to clear'); }
  };

  const autoGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/shopping-list/auto-generate');
      if (res.data.length > 0) {
        setItems(prev => [...res.data, ...prev]);
        toast.success(`Added ${res.data.length} items from expiring/low stock`);
      } else {
        toast('No items to add');
      }
    } catch { toast.error('Failed to auto-generate'); }
    setGenerating(false);
  };

  const unpurchased = items.filter(i => !i.purchased);
  const purchased = items.filter(i => i.purchased);

  return (
    <Layout>
      <div className="slide-up">
        <h1 className="text-2xl font-serif text-fridgit-text mb-4">Shopping List</h1>

        {/* Add item form */}
        <form onSubmit={addItem} className="flex gap-2 mb-4">
          <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add item..."
            className="flex-1 px-3 py-2.5 rounded-xl border border-fridgit-border bg-white text-fridgit-text focus:border-fridgit-primary transition" />
          <button type="submit" disabled={adding}
            className="px-4 py-2.5 rounded-xl bg-fridgit-primary text-white font-medium disabled:opacity-50">
            {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          </button>
        </form>

        {/* Auto-generate button */}
        <button onClick={autoGenerate} disabled={generating}
          className="w-full mb-4 py-2.5 rounded-xl border-2 border-dashed border-fridgit-primary text-fridgit-primary font-medium hover:bg-fridgit-primaryPale transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {generating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          Auto-add from expiring items
        </button>

        {loading ? (
          <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-fridgit-primary mx-auto" /></div>
        ) : (
          <>
            {/* Unpurchased */}
            <div className="space-y-2 mb-4">
              {unpurchased.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-fridgit-border p-3 flex items-center gap-3">
                  <button onClick={() => togglePurchased(item.id, item.purchased)}
                    className="w-6 h-6 rounded-full border-2 border-fridgit-border flex-shrink-0 hover:border-fridgit-primary transition-colors" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-fridgit-text">{item.item_name}</span>
                    {item.auto_generated && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-fridgit-accentPale text-fridgit-accent font-medium">auto</span>}
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="text-fridgit-textMuted hover:text-fridgit-danger transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {unpurchased.length === 0 && <p className="text-center text-sm text-fridgit-textMuted py-4">Nothing to buy!</p>}
            </div>

            {/* Purchased */}
            {purchased.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-fridgit-textMid">Purchased ({purchased.length})</h3>
                  <button onClick={clearPurchased} className="text-xs text-fridgit-danger font-medium hover:underline">Clear all</button>
                </div>
                <div className="space-y-2">
                  {purchased.map(item => (
                    <div key={item.id} className="bg-fridgit-surfaceAlt rounded-xl border border-fridgit-border p-3 flex items-center gap-3 opacity-60">
                      <button onClick={() => togglePurchased(item.id, item.purchased)}
                        className="w-6 h-6 rounded-full bg-fridgit-primary flex-shrink-0 flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </button>
                      <span className="text-sm text-fridgit-textMid line-through flex-1">{item.item_name}</span>
                      <button onClick={() => deleteItem(item.id)} className="text-fridgit-textMuted hover:text-fridgit-danger transition-colors">
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