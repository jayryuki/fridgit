import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Layout from '../components/Layout.jsx';
import { Plus, AlertTriangle, Package, Clock } from 'lucide-react';
import api from '../services/api.js';

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
    if (days <= 1) return 'bg-fridgit-dangerPale text-fridgit-danger';
    if (days <= 3) return 'bg-fridgit-accentPale text-fridgit-accent';
    return 'bg-fridgit-primaryPale text-fridgit-primary';
  };

  return (
    <Layout>
      <div className="slide-up">
        <div className="mb-6">
          <h1 className="text-2xl font-serif text-fridgit-text">{getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!</h1>
          <p className="text-fridgit-textMuted text-sm mt-1">Here's what's in your fridge</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 border border-fridgit-border text-center">
            <Package size={20} className="text-fridgit-primary mx-auto mb-1" />
            <div className="text-xl font-bold text-fridgit-text">{items.length}</div>
            <div className="text-xs text-fridgit-textMuted">Items</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-fridgit-border text-center">
            <AlertTriangle size={20} className="text-fridgit-accent mx-auto mb-1" />
            <div className="text-xl font-bold text-fridgit-text">{expiring.length}</div>
            <div className="text-xs text-fridgit-textMuted">Expiring</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-fridgit-border text-center">
            <Clock size={20} className="text-fridgit-textMuted mx-auto mb-1" />
            <div className="text-xl font-bold text-fridgit-text">{items.filter(i => !i.expiry_date).length}</div>
            <div className="text-xs text-fridgit-textMuted">No Date</div>
          </div>
        </div>

        {/* Expiring Soon */}
        {expiring.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-serif text-fridgit-text mb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-fridgit-accent" />
              Needs Attention
            </h2>
            <div className="space-y-2">
              {expiring.slice(0, 5).map(item => {
                const days = getDaysUntilExpiry(item.expiry_date);
                return (
                  <div key={item.id} className="bg-white rounded-xl p-3 border border-fridgit-border flex items-center gap-3">
                    <span className="text-2xl">{item.emoji || '\u{1F4E6}'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-fridgit-text truncate">{item.name}</div>
                      <div className="text-xs text-fridgit-textMuted">Qty: {item.quantity}</div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${getExpiryColor(days)}`}>
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
          <div className="bg-white rounded-2xl border border-fridgit-border p-8 text-center">
            <Package size={48} className="text-fridgit-textMuted mx-auto mb-3" />
            <h3 className="text-lg font-serif text-fridgit-text mb-1">Your fridge is empty</h3>
            <p className="text-sm text-fridgit-textMuted mb-4">Add your first item to get started</p>
            <button onClick={() => navigate('/new-item')} className="bg-fridgit-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-fridgit-primaryLight transition-colors">
              Add Item
            </button>
          </div>
        )}

        {/* FAB Button */}
        <div className="fixed bottom-24 right-4 flex flex-col gap-3 max-w-lg">
          <button onClick={() => navigate('/new-item')}
            className="w-14 h-14 rounded-full bg-fridgit-primary text-white shadow-lg hover:bg-fridgit-primaryLight transition-colors flex items-center justify-center">
            <Plus size={28} />
          </button>
        </div>
      </div>
    </Layout>
  );
}
