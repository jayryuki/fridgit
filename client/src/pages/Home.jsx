import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Layout from '../components/Layout.jsx';
import { Plus, AlertTriangle, Package, Clock, X, Save, Loader2, Trash2 } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import SharePicker from '../components/SharePicker.jsx';

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

const locationOptions = ['fridge', 'freezer', 'pantry', 'counter'];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchItems = () => {
    Promise.all([
      api.get('/items').then((r) => r.data),
      api.get('/items/expiring?days=7').then((r) => r.data),
    ])
      .then(([allItems, expiringItems]) => {
        setItems(allItems);
        setExpiring(expiringItems);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const getDaysUntilExpiry = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryColor = (days) => {
    if (days <= 1) return 'bg-fridgit-dangerPale dark:bg-dracula-red/20 text-fridgit-danger dark:text-dracula-red';
    if (days <= 3) return 'bg-fridgit-accentPale dark:bg-dracula-orange/20 text-fridgit-accent dark:text-dracula-orange';
    return 'bg-fridgit-primaryPale dark:bg-dracula-green/20 text-fridgit-primary dark:text-dracula-green';
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
      setExpiring(expiring.map((i) => (i.id === selected.id ? res.data : i)));
      setSelected(res.data);
      toast.success('Item updated');
    } catch {
      toast.error('Failed to update');
    }
    setSaving(false);
  };

  const deleteItem = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/items/${id}`);
      setItems(items.filter((i) => i.id !== id));
      setExpiring(expiring.filter((i) => i.id !== id));
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
        setExpiring(expiring.filter((i) => i.id !== id));
        if (selected?.id === id) setSelected(null);
      } else {
        setItems(items.map((i) => (i.id === id ? res.data.item : i)));
        setExpiring(expiring.map((i) => (i.id === id ? res.data.item : i)));
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

  return (
    <Layout>
      <div className="page-stack slide-up">
        <section className="hero-card">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-serif text-fridgit-text dark:text-dracula-fg sm:text-[2rem]">
                {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!
              </h1>
              <p className="mt-2 text-sm text-fridgit-textMuted dark:text-dracula-comment sm:text-base">
                Here is a quick view of what is in your kitchen and what needs attention soon.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <button
                onClick={() => navigate('/fridge')}
                className="inline-flex items-center justify-center rounded-2xl border border-fridgit-border bg-white px-5 py-3 text-sm font-semibold text-fridgit-text transition-colors hover:bg-fridgit-surfaceAlt dark:border-dracula-line dark:bg-dracula-surface dark:text-dracula-fg dark:hover:bg-dracula-currentLine"
              >
                Open fridge
              </button>
              <button
                onClick={() => navigate('/new-item')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-fridgit-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-fridgit-primaryLight dark:bg-dracula-green dark:text-dracula-bg dark:hover:bg-dracula-green/80"
              >
                <Plus size={18} />
                Add item
              </button>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <div className="panel-section text-center">
            <Package size={22} className="mx-auto mb-2 text-fridgit-primary dark:text-dracula-green" />
            <div className="text-2xl font-bold text-fridgit-text dark:text-dracula-fg">{items.length}</div>
            <div className="text-sm text-fridgit-textMuted dark:text-dracula-comment">Items tracked</div>
          </div>
          <div className="panel-section text-center">
            <AlertTriangle size={22} className="mx-auto mb-2 text-fridgit-accent dark:text-dracula-orange" />
            <div className="text-2xl font-bold text-fridgit-text dark:text-dracula-fg">{expiring.length}</div>
            <div className="text-sm text-fridgit-textMuted dark:text-dracula-comment">Expiring soon</div>
          </div>
          <div className="panel-section text-center">
            <Clock size={22} className="mx-auto mb-2 text-fridgit-textMuted dark:text-dracula-comment" />
            <div className="text-2xl font-bold text-fridgit-text dark:text-dracula-fg">{items.filter((item) => !item.expiry_date).length}</div>
            <div className="text-sm text-fridgit-textMuted dark:text-dracula-comment">No expiry date</div>
          </div>
        </section>

        <section className="responsive-grid-2 items-start">
          <div className="panel-section">
            <div className="section-heading mb-4">
              <div>
                <h2 className="text-xl font-serif text-fridgit-text dark:text-dracula-fg">Needs attention</h2>
                <p className="text-sm text-fridgit-textMuted dark:text-dracula-comment">Items expiring within the next week.</p>
              </div>
            </div>

            {expiring.length > 0 ? (
              <div className="space-y-3">
                {expiring.slice(0, 6).map((item) => {
                  const days = getDaysUntilExpiry(item.expiry_date);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openDetail(item)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-fridgit-border bg-white p-3 text-left transition hover:shadow-sm dark:border-dracula-line dark:bg-dracula-surface dark:hover:border-dracula-purple/50"
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-12 w-12 rounded-xl object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-fridgit-surfaceAlt text-2xl dark:bg-dracula-bg">{item.emoji || '\u{1F4E6}'}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-fridgit-text dark:text-dracula-fg">{item.name}</div>
                        <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment">Qty: {item.quantity} {item.unit}</div>
                      </div>
                      <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${getExpiryColor(days)}`}>
                        {days <= 0 ? 'Expired' : days === 1 ? '1 day' : `${days} days`}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="panel-card-muted p-5 text-sm text-fridgit-textMuted dark:text-dracula-comment">
                Nothing urgent right now.
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="section-heading mb-4">
              <div>
                <h2 className="text-xl font-serif text-fridgit-text dark:text-dracula-fg">Overview</h2>
                <p className="text-sm text-fridgit-textMuted dark:text-dracula-comment">Use this as your quick launch area on larger screens.</p>
              </div>
            </div>

            {!loading && items.length === 0 ? (
              <div className="rounded-2xl border border-fridgit-border bg-white p-8 text-center dark:border-dracula-line dark:bg-dracula-surface">
                <Package size={48} className="mx-auto mb-3 text-fridgit-textMuted dark:text-dracula-comment" />
                <h3 className="mb-1 text-lg font-serif text-fridgit-text dark:text-dracula-fg">Your fridge is empty</h3>
                <p className="mb-4 text-sm text-fridgit-textMuted dark:text-dracula-comment">Add your first item to get started.</p>
                <button
                  onClick={() => navigate('/new-item')}
                  className="rounded-xl bg-fridgit-primary px-6 py-2.5 font-semibold text-white transition-colors hover:bg-fridgit-primaryLight dark:bg-dracula-green dark:text-dracula-bg dark:hover:bg-dracula-green/80"
                >
                  Add item
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="panel-card-muted p-4">
                  <div className="text-sm font-semibold text-fridgit-text dark:text-dracula-fg">Browse inventory</div>
                  <p className="mt-1 text-sm text-fridgit-textMuted dark:text-dracula-comment">Review all items, filter by category, and update details.</p>
                  <button
                    onClick={() => navigate('/fridge')}
                    className="mt-4 text-sm font-semibold text-fridgit-primary hover:underline dark:text-dracula-green"
                  >
                    Go to fridge
                  </button>
                </div>
                <div className="panel-card-muted p-4">
                  <div className="text-sm font-semibold text-fridgit-text dark:text-dracula-fg">Capture new groceries</div>
                  <p className="mt-1 text-sm text-fridgit-textMuted dark:text-dracula-comment">Add by barcode, search, or manual entry from any screen size.</p>
                  <button
                    onClick={() => navigate('/new-item')}
                    className="mt-4 text-sm font-semibold text-fridgit-primary hover:underline dark:text-dracula-green"
                  >
                    Add another item
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <button onClick={() => navigate('/new-item')} className="floating-action" aria-label="Add item">
          <Plus size={28} />
        </button>
      </div>

      {selected && (
        <div className="desktop-modal" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
          <div className="desktop-modal-card slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-serif text-fridgit-text dark:text-dracula-fg">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 transition-colors hover:bg-fridgit-surfaceAlt dark:hover:bg-dracula-surface">
                <X size={20} className="text-fridgit-textMuted dark:text-dracula-comment" />
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
              <div className="flex justify-center lg:justify-start">
                {selected.image_url ? (
                  <img src={selected.image_url} alt={selected.name} className="h-40 w-40 rounded-2xl border border-fridgit-border object-cover dark:border-dracula-line lg:h-52 lg:w-52" />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-fridgit-surfaceAlt dark:bg-dracula-surface lg:h-52 lg:w-52">
                    <span className="text-7xl">{selected.emoji || '\u{1F4E6}'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {(hasNutrition(selected.calories) || hasNutrition(selected.protein) || hasNutrition(selected.carbs) || hasNutrition(selected.fat)) && (
                  <div className="rounded-2xl bg-fridgit-bg p-4 dark:bg-dracula-bg">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fridgit-textMuted dark:text-dracula-comment">Nutrition (per 100g)</h3>
                    <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
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

                <div className="flex flex-wrap items-center gap-3 text-sm text-fridgit-textMid dark:text-dracula-fg">
                  <span className="rounded-md bg-fridgit-primaryPale px-2 py-0.5 text-xs font-semibold capitalize text-fridgit-primary dark:bg-dracula-green/20 dark:text-dracula-green">{selected.category}</span>
                  <span>Qty: {selected.quantity} {selected.unit}</span>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">Location</label>
                    <select
                      value={editForm.location}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                      className="w-full rounded-xl border border-fridgit-border bg-fridgit-bg px-3 py-2.5 capitalize text-fridgit-text dark:border-dracula-line dark:bg-dracula-bg dark:text-dracula-fg"
                    >
                      {locationOptions.map((loc) => (
                        <option key={loc} value={loc} className="capitalize">
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">Expiry Date</label>
                    <input
                      type="date"
                      value={editForm.expiry_date}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
                      className="w-full rounded-xl border border-fridgit-border bg-fridgit-bg px-3 py-2.5 text-fridgit-text transition focus:border-fridgit-primary dark:border-dracula-line dark:bg-dracula-bg dark:text-dracula-fg dark:focus:border-dracula-green"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-fridgit-border bg-fridgit-bg p-4 dark:border-dracula-line dark:bg-dracula-bg">
                  <SharePicker
                    shared={editForm.shared}
                    sharedWith={editForm.shared_with || []}
                    currentUserId={user?.id}
                    onChange={({ shared, sharedWith }) => setEditForm((prev) => ({ ...prev, shared, shared_with: sharedWith }))}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={saveDetail}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-fridgit-primary py-3 font-semibold text-white transition-colors hover:bg-fridgit-primaryLight disabled:opacity-50 dark:bg-dracula-green dark:text-dracula-bg dark:hover:bg-dracula-green/80"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Changes
                  </button>
                  <button
                    onClick={(e) => consumeItem(selected.id, e)}
                    className="rounded-xl bg-fridgit-accentPale px-4 py-3 font-semibold text-fridgit-accent transition-colors hover:bg-fridgit-accent hover:text-white dark:bg-dracula-orange/20 dark:text-dracula-orange dark:hover:bg-dracula-orange dark:hover:text-dracula-bg"
                  >
                    Use
                  </button>
                  <button
                    onClick={(e) => deleteItem(selected.id, e)}
                    className="rounded-xl bg-fridgit-dangerPale px-4 py-3 text-fridgit-danger transition-colors hover:bg-fridgit-danger hover:text-white dark:bg-dracula-red/20 dark:text-dracula-red dark:hover:bg-dracula-red dark:hover:text-dracula-bg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
