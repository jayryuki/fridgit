import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import useItemActions from '../hooks/useItemActions.js';
import Layout from '../components/Layout.jsx';
import ItemDetailModal from '../components/ItemDetailModal.jsx';
import { Plus, AlertTriangle, Package, Clock } from 'lucide-react';
import { r2, hasNutrition, getDaysUntilExpiry, getExpiryColor } from '../utils/helpers.js';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    selected, setSelected, editForm, setEditForm, saving,
    openDetail, saveDetail, deleteItem, consumeItem, addToShoppingList,
  } = useItemActions({ items, setItems, expiring, setExpiring });

  useEffect(() => {
    api
      .get('/items')
      .then((r) => {
        setItems(r.data);
        const soon = r.data.filter((i) => {
          const d = getDaysUntilExpiry(i.expiry_date);
          return d !== null && d <= 7;
        });
        setExpiring(soon);
      })
      .catch(() => toast.error('Failed to load items'))
      .finally(() => setLoading(false));
  }, []);

  const totalItems = items.length;
  const expiringCount = expiring.length;
  const totalCalories = items.reduce((s, i) => s + (parseFloat(i.calories) || 0), 0);

  return (
    <Layout>
      <div className="page-stack slide-up">
        {/* Hero */}
        <section className="hero-card">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-serif text-fridgit-text dark:text-dracula-fg sm:text-[2rem]">
                Welcome{user?.display_name ? `, ${user.display_name}` : ''}
              </h1>
              <p className="mt-2 text-sm text-fridgit-textMuted dark:text-dracula-comment sm:text-base">
                Here's a quick look at what's in your kitchen.
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

        {/* Stat cards */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="panel-section flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fridgit-primaryPale dark:bg-dracula-green/20">
              <Package size={22} className="text-fridgit-primary dark:text-dracula-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-fridgit-text dark:text-dracula-fg">{totalItems}</p>
              <p className="text-sm text-fridgit-textMuted dark:text-dracula-comment">Total items</p>
            </div>
          </div>
          <div className="panel-section flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fridgit-accentPale dark:bg-dracula-orange/20">
              <AlertTriangle size={22} className="text-fridgit-accent dark:text-dracula-orange" />
            </div>
            <div>
              <p className="text-2xl font-bold text-fridgit-text dark:text-dracula-fg">{expiringCount}</p>
              <p className="text-sm text-fridgit-textMuted dark:text-dracula-comment">Expiring soon</p>
            </div>
          </div>
          <div className="panel-section flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fridgit-dangerPale dark:bg-dracula-red/20">
              <Clock size={22} className="text-fridgit-danger dark:text-dracula-red" />
            </div>
            <div>
              <p className="text-2xl font-bold text-fridgit-text dark:text-dracula-fg">{r2(totalCalories)}</p>
              <p className="text-sm text-fridgit-textMuted dark:text-dracula-comment">Total kcal</p>
            </div>
          </div>
        </section>

        {/* Expiring soon */}
        {expiringCount > 0 && (
          <section className="panel-section">
            <h2 className="mb-4 text-lg font-serif text-fridgit-text dark:text-dracula-fg">Needs attention</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {expiring.map((item) => {
                const days = getDaysUntilExpiry(item.expiry_date);
                return (
                  <div
                    key={item.id}
                    onClick={() => openDetail(item)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-fridgit-border bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-dracula-line dark:bg-dracula-surface"
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-fridgit-surfaceAlt text-2xl dark:bg-dracula-bg">
                        {item.emoji || '\u{1F4E6}'}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-fridgit-text dark:text-dracula-fg">{item.name}</p>
                      <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${getExpiryColor(days)}`}>
                        {days <= 0 ? 'Expired' : `${days}d left`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent items */}
        <section className="panel-section">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-serif text-fridgit-text dark:text-dracula-fg">Recent items</h2>
            <button onClick={() => navigate('/fridge')} className="text-sm font-semibold text-fridgit-primary hover:underline dark:text-dracula-green">
              View all
            </button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-fridgit-textMuted dark:text-dracula-comment">Loading...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-fridgit-textMuted dark:text-dracula-comment">Your fridge is empty</p>
              <button onClick={() => navigate('/new-item')} className="mt-3 text-sm font-semibold text-fridgit-primary hover:underline dark:text-dracula-green">
                Add your first item
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  onClick={() => openDetail(item)}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-fridgit-border bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-dracula-line dark:bg-dracula-surface"
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-fridgit-surfaceAlt text-2xl dark:bg-dracula-bg">
                      {item.emoji || '\u{1F4E6}'}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fridgit-text dark:text-dracula-fg">{item.name}</p>
                    <p className="text-sm text-fridgit-textMuted dark:text-dracula-comment">
                      {item.quantity} {item.unit}
                      {hasNutrition(item.calories) ? ` \u00B7 ${r2(item.calories)} kcal` : ''}
                    </p>
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
