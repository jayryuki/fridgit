import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Layout from '../components/Layout.jsx';
import { Plus, AlertTriangle, Package, Clock, X } from 'lucide-react';
import api from '../services/api.js';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function r2(val) {
  const n = parseFloat(val);
  if (val == null || val === '' || isNaN(n)) return '-';
  return String(Math.round(n * 100) / 100);
}

function hasNutrition(v) {
  return v != null && v !== '' && v !== false;
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

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

  const openDetail = (item) => {
    setSelected(item);
  };

  return (
    <Layout>
      <div className="slide-up">
        <div className="mb-6">
          <h1 className="text-2xl font-serif text-fridgit-text dark:text-dracula-fg">{getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!</h1>
          <p className="text-fridgit-textMuted dark:text-dracula-comment text-sm mt-1">Here's what's in your fridge</p>
        </div>

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
                      <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment">Qty: {item.quantity} {item.unit}</div>
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

        <div className="fixed bottom-24 right-4 flex flex-col gap-3 max-w-lg">
          <button onClick={() => navigate('/new-item')}
            className="w-14 h-14 rounded-full bg-fridgit-primary dark:bg-dracula-green text-white dark:text-dracula-bg shadow-lg hover:bg-fridgit-primaryLight dark:hover:bg-dracula-green/80 transition-colors flex items-center justify-center">
            <Plus size={28} />
          </button>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
          <div className="relative w-full max-w-lg bg-white dark:bg-dracula-currentLine rounded-t-2xl p-5 pb-8 slide-up max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif text-fridgit-text dark:text-dracula-fg">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-fridgit-surfaceAlt dark:hover:bg-dracula-surface transition-colors">
                <X size={20} className="text-fridgit-textMuted dark:text-dracula-comment" />
              </button>
            </div>

            <div className="flex justify-center mb-4">
              {selected.image_url ? (
                <img src={selected.image_url} alt={selected.name} className="w-32 h-32 rounded-xl object-cover border border-fridgit-border dark:border-dracula-line" />
              ) : (
                <div className="w-32 h-32 rounded-xl bg-fridgit-surfaceAlt dark:bg-dracula-surface flex items-center justify-center">
                  <span className="text-6xl">{selected.emoji || '\u{1F4E6}'}</span>
                </div>
              )}
            </div>

            {(hasNutrition(selected.calories) || hasNutrition(selected.protein) || hasNutrition(selected.carbs) || hasNutrition(selected.fat)) && (
              <div className="bg-fridgit-bg dark:bg-dracula-bg rounded-xl p-3 mb-4">
                <h3 className="text-xs font-semibold text-fridgit-textMuted dark:text-dracula-comment mb-2 uppercase tracking-wide">Nutrition (per 100g)</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-fridgit-text dark:text-dracula-fg">{r2(selected.calories)}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">kcal</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-fridgit-primary dark:text-dracula-green">{r2(selected.protein)}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Protein</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-fridgit-accent dark:text-dracula-orange">{r2(selected.carbs)}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Carbs</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-fridgit-danger dark:text-dracula-red">{r2(selected.fat)}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Fat</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-fridgit-textMuted dark:text-dracula-comment mb-4">
              <span className="inline-flex px-2 py-1 rounded-lg bg-fridgit-primaryPale dark:bg-dracula-green/20 text-fridgit-primary dark:text-dracula-green font-medium">{selected.category || 'other'}</span>
              <span>{selected.quantity} {selected.unit}</span>
              {selected.expiry_date && <span>Expires {new Date(selected.expiry_date).toLocaleDateString()}</span>}
            </div>

            {selected.barcode && (
              <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment break-all mb-2">Barcode: {selected.barcode}</div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
