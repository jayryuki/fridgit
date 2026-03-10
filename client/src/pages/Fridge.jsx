import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import useItemActions from '../hooks/useItemActions.js';
import Layout from '../components/Layout.jsx';
import ItemDetailModal from '../components/ItemDetailModal.jsx';
import { Search, Plus, Trash2 } from 'lucide-react';
import { categories } from '../utils/constants.js';
import { r2, hasNutrition, getDaysUntilExpiry } from '../utils/helpers.js';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function FridgePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  const {
    selected, setSelected, editForm, setEditForm, saving,
    openDetail, saveDetail, deleteItem, consumeItem, addToShoppingList,
  } = useItemActions({ items, setItems });

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

  const filtered = items.filter((item) => {
    const matchCat = category === 'all' || item.category === category;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Returns a JSX badge element — kept local because it renders JSX.
  // Uses getDaysUntilExpiry from shared helpers.
  const getExpiryBadge = (date) => {
    const days = getDaysUntilExpiry(date);
    if (days === null) return null;
    if (days <= 0)
      return (
        <span className="rounded-md bg-fridgit-dangerPale px-1.5 py-0.5 text-[10px] font-bold text-fridgit-danger dark:bg-dracula-red/20 dark:text-dracula-red">
          Expired
        </span>
      );
    if (days <= 3)
      return (
        <span className="rounded-md bg-fridgit-accentPale px-1.5 py-0.5 text-[10px] font-bold text-fridgit-accent dark:bg-dracula-orange/20 dark:text-dracula-orange">
          {days}d left
        </span>
      );
    if (days <= 7)
      return (
        <span className="rounded-md bg-fridgit-primaryPale px-1.5 py-0.5 text-[10px] font-bold text-fridgit-primary dark:bg-dracula-green/20 dark:text-dracula-green">
          {days}d left
        </span>
      );
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
