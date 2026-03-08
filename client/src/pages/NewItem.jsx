import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Camera, X, Search, ArrowLeft, Loader2, Package } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';
import SharePicker from '../components/SharePicker.jsx';

const categoryOptions = [
  { key: 'dairy', emoji: '\u{1F95B}', label: 'Dairy' },
  { key: 'meat', emoji: '\u{1F357}', label: 'Meat' },
  { key: 'vegetables', emoji: '\u{1F96C}', label: 'Veggies' },
  { key: 'fruits', emoji: '\u{1F34E}', label: 'Fruits' },
  { key: 'beverages', emoji: '\u{1F964}', label: 'Drinks' },
  { key: 'condiments', emoji: '\u{1FAD9}', label: 'Sauces' },
  { key: 'grains', emoji: '\u{1F33E}', label: 'Grains' },
  { key: 'snacks', emoji: '\u{1F36A}', label: 'Snacks' },
  { key: 'other', emoji: '\u{1F4E6}', label: 'Other' },
];

const locationOptions = ['fridge', 'freezer', 'pantry', 'counter'];
const expiryNumberOptions = Array.from({ length: 30 }, (_, i) => i + 1);
const expiryUnitOptions = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];
const WHEEL_ROW_HEIGHT = 32;
const WHEEL_VIEWPORT_HEIGHT = 56;
const WHEEL_CENTER_OFFSET = (WHEEL_VIEWPORT_HEIGHT - WHEEL_ROW_HEIGHT) / 2;

function r1(val) {
  const n = parseFloat(val);
  if (!val || isNaN(n)) return '';
  return String(Math.round(n * 10) / 10);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addToDate(value, unit) {
  const date = new Date();
  if (unit === 'days') date.setDate(date.getDate() + value);
  if (unit === 'weeks') date.setDate(date.getDate() + value * 7);
  if (unit === 'months') date.setMonth(date.getMonth() + value);
  if (unit === 'years') date.setFullYear(date.getFullYear() + value);
  return toDateInputValue(date);
}

export default function NewItem() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState('form');
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const scannerRef = useRef(null);
  const [form, setForm] = useState({
    name: '', barcode: '', category: 'other', quantity: 1, unit: 'count',
    location: 'fridge', expiry_date: '', calories: '', protein: '', carbs: '', fat: '',
    emoji: '\u{1F4E6}', color: '#F5F5F5', shared: false, image_url: '', shared_with: [],
  });
  const [expiryNumber, setExpiryNumber] = useState(3);
  const [expiryUnit, setExpiryUnit] = useState('days');
  const expiryNumberWheelRef = useRef(null);
  const expiryUnitWheelRef = useRef(null);
  const numberScrollTimeoutRef = useRef(null);
  const unitScrollTimeoutRef = useRef(null);

  const numberWheelOptions = useMemo(
    () => expiryNumberOptions.map((value) => ({ key: `number-${value}`, value, label: String(value) })),
    []
  );
  const unitWheelOptions = useMemo(
    () => expiryUnitOptions.map((option) => ({ key: `unit-${option.value}`, value: option.value, label: option.label })),
    []
  );

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    updateForm('expiry_date', addToDate(expiryNumber, expiryUnit));
  }, [expiryNumber, expiryUnit]);

  const snapWheel = (ref, index) => {
    if (!ref.current) return;
    ref.current.scrollTo({ top: Math.max(0, index * WHEEL_ROW_HEIGHT - WHEEL_CENTER_OFFSET), behavior: 'smooth' });
  };

  const syncNumberFromScroll = () => {
    if (!expiryNumberWheelRef.current) return;
    const rawIndex = Math.round((expiryNumberWheelRef.current.scrollTop + WHEEL_CENTER_OFFSET) / WHEEL_ROW_HEIGHT);
    const clampedIndex = Math.min(expiryNumberOptions.length - 1, Math.max(0, rawIndex));
    const clampedValue = expiryNumberOptions[clampedIndex];
    if (clampedValue !== expiryNumber) setExpiryNumber(clampedValue);
  };

  const syncUnitFromScroll = () => {
    if (!expiryUnitWheelRef.current) return;
    const rawIndex = Math.round((expiryUnitWheelRef.current.scrollTop + WHEEL_CENTER_OFFSET) / WHEEL_ROW_HEIGHT);
    const optionIndex = Math.min(expiryUnitOptions.length - 1, Math.max(0, rawIndex));
    const clampedValue = expiryUnitOptions[optionIndex].value;
    if (clampedValue !== expiryUnit) setExpiryUnit(clampedValue);
  };

  const handleWheelScroll = (type) => {
    if (type === 'number') {
      syncNumberFromScroll();
      if (numberScrollTimeoutRef.current) clearTimeout(numberScrollTimeoutRef.current);
      numberScrollTimeoutRef.current = setTimeout(() => {
        if (!expiryNumberWheelRef.current) return;
        const rawIndex = Math.round((expiryNumberWheelRef.current.scrollTop + WHEEL_CENTER_OFFSET) / WHEEL_ROW_HEIGHT);
        const snappedIndex = Math.min(expiryNumberOptions.length - 1, Math.max(0, rawIndex));
        snapWheel(expiryNumberWheelRef, snappedIndex);
      }, 90);
      return;
    }

    syncUnitFromScroll();
    if (unitScrollTimeoutRef.current) clearTimeout(unitScrollTimeoutRef.current);
    unitScrollTimeoutRef.current = setTimeout(() => {
      if (!expiryUnitWheelRef.current) return;
      const rawIndex = Math.round((expiryUnitWheelRef.current.scrollTop + WHEEL_CENTER_OFFSET) / WHEEL_ROW_HEIGHT);
      const snappedIndex = Math.min(expiryUnitOptions.length - 1, Math.max(0, rawIndex));
      snapWheel(expiryUnitWheelRef, snappedIndex);
    }, 90);
  };

  useEffect(() => {
    snapWheel(expiryNumberWheelRef, expiryNumberOptions.indexOf(expiryNumber));
  }, [expiryNumber]);

  useEffect(() => {
    snapWheel(expiryUnitWheelRef, expiryUnitOptions.findIndex((option) => option.value === expiryUnit));
  }, [expiryUnit]);

  useEffect(() => () => {
    if (numberScrollTimeoutRef.current) clearTimeout(numberScrollTimeoutRef.current);
    if (unitScrollTimeoutRef.current) clearTimeout(unitScrollTimeoutRef.current);
  }, []);

  const startScan = async () => {
    setMode('scan');
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          await scanner.stop();
          scannerRef.current = null;
          setScanning(false);
          lookupBarcode(decodedText);
        },
        () => {}
      );
    } catch (err) {
      toast.error('Camera access denied or not available');
      setMode('form');
      setScanning(false);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
    setMode('form');
  };

  useEffect(() => { return () => { if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); } }; }, []);

  const lookupBarcode = async (code) => {
    updateForm('barcode', code);
    setMode('form');
    try {
      const res = await api.get(`/barcode/${code}`);
      const p = res.data;
      setForm(prev => ({
        ...prev, name: p.name || prev.name, category: p.category || prev.category,
        calories: p.calories ? String(Math.round(Number(p.calories))) : '',
        protein: r1(p.protein), carbs: r1(p.carbs), fat: r1(p.fat),
        emoji: p.emoji || prev.emoji, color: p.color || prev.color, barcode: code,
        image_url: p.image_url || prev.image_url,
      }));
      toast.success(`Found: ${p.name}`);
    } catch {
      toast.error('Product not found. Enter details manually.');
    }
  };

  const searchProducts = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/barcode/search/${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
    } catch { toast.error('Search failed'); }
    setSearching(false);
  };

  const selectProduct = (product) => {
    setForm(prev => ({
      ...prev, name: product.name, category: product.category,
      calories: product.calories ? String(Math.round(Number(product.calories))) : '',
      protein: r1(product.protein), carbs: r1(product.carbs), fat: r1(product.fat),
      emoji: product.emoji || prev.emoji, color: product.color || prev.color,
      barcode: product.barcode || prev.barcode,
      image_url: product.image_url || prev.image_url,
    }));
    setMode('form');
    setSearchResults([]);
    toast.success(`Selected: ${product.name}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await api.post('/items', {
        ...form,
        quantity: parseInt(form.quantity) || 1,
        calories: form.calories ? Math.round(Number(form.calories)) : null,
        protein: r1(form.protein) || null,
        carbs: r1(form.carbs) || null,
        fat: r1(form.fat) || null,
        expiry_date: form.expiry_date || null,
        image_url: form.image_url || null,
        shared_with: form.shared_with,
      });
      toast.success('Item added!');
      navigate('/fridge');
    } catch { toast.error('Failed to add item'); }
    setSaving(false);
  };

  if (mode === 'scan') {
    return (
      <Layout>
        <div className="slide-up">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-serif text-fridgit-text dark:text-dracula-fg">Scan Barcode</h1>
            <button onClick={stopScan} className="p-2 rounded-full bg-white dark:bg-dracula-currentLine shadow-soft">
              <X size={20} />
            </button>
          </div>
          <div id="barcode-reader" className="w-full overflow-hidden rounded-3xl bg-black shadow-soft" />
          {!scanning && (
            <p className="mt-4 text-center text-sm text-fridgit-muted dark:text-dracula-comment">
              Starting camera...
            </p>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-md slide-up">
        <button
          onClick={() => navigate('/fridge')}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-fridgit-muted transition hover:text-fridgit-text dark:text-dracula-comment dark:hover:text-dracula-fg"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="card p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-fridgit-muted dark:text-dracula-comment">Add item</p>
              <h1 className="mt-1 text-2xl font-serif text-fridgit-text dark:text-dracula-fg">New fridge item</h1>
              <p className="mt-2 text-sm text-fridgit-muted dark:text-dracula-comment">
                Capture a product, tune its details, and share it with your home.
              </p>
            </div>
            <div className="hidden rounded-3xl bg-fridgit-accent/10 p-3 text-fridgit-accent shadow-soft dark:bg-dracula-purple/20 dark:text-dracula-purple sm:block">
              <Package size={22} />
            </div>
          </div>

          <div className="mb-4 flex gap-2">
            <button type="button" onClick={startScan} className="btn-outline flex-1 inline-flex items-center justify-center gap-2">
              <Camera size={18} /> Scan barcode
            </button>
            <button type="button" onClick={() => setMode('search')} className="btn-outline flex-1 inline-flex items-center justify-center gap-2">
              <Search size={18} /> Search
            </button>
          </div>

          {mode === 'search' && (
            <div className="mb-4 rounded-3xl border border-black/5 bg-white/90 p-3 shadow-soft dark:border-white/10 dark:bg-dracula-currentLine/70">
              <div className="flex gap-2">
                <input
                  className="input-field"
                  placeholder="Search product name"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <button type="button" onClick={searchProducts} className="btn-primary px-4" disabled={searching}>
                  {searching ? <Loader2 className="animate-spin" size={18} /> : 'Go'}
                </button>
              </div>
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                {searchResults.map((product, idx) => (
                  <button
                    key={`${product.barcode || product.name}-${idx}`}
                    type="button"
                    onClick={() => selectProduct(product)}
                    className="w-full rounded-2xl border border-black/5 bg-white px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:bg-dracula-bg"
                  >
                    <div className="font-medium text-fridgit-text dark:text-dracula-fg">{product.name}</div>
                    <div className="text-xs text-fridgit-muted dark:text-dracula-comment">{product.brand || 'Unknown brand'}</div>
                  </button>
                ))}
                {!searchResults.length && !searching && (
                  <p className="py-2 text-sm text-fridgit-muted dark:text-dracula-comment">No products yet. Try another search.</p>
                )}
              </div>
              <button type="button" onClick={() => setMode('form')} className="mt-3 text-sm text-fridgit-muted hover:text-fridgit-text dark:text-dracula-comment dark:hover:text-dracula-fg">
                Done searching
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-fridgit-text dark:text-dracula-fg">Name</label>
              <input
                className="input-field"
                value={form.name}
                onChange={e => updateForm('name', e.target.value)}
                placeholder="e.g. Greek Yogurt"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-fridgit-text dark:text-dracula-fg">Quantity</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.quantity}
                  onChange={e => updateForm('quantity', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-fridgit-text dark:text-dracula-fg">Unit</label>
                <input
                  className="input-field"
                  value={form.unit}
                  onChange={e => updateForm('unit', e.target.value)}
                  placeholder="count, lbs, oz..."
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fridgit-text dark:text-dracula-fg">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {categoryOptions.map(option => {
                  const active = form.category === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        updateForm('category', option.key);
                        updateForm('emoji', option.emoji);
                      }}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-fridgit-accent bg-fridgit-accent/10 text-fridgit-accent shadow-soft dark:border-dracula-purple dark:bg-dracula-purple/20 dark:text-dracula-purple' : 'border-black/5 bg-white text-fridgit-text hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:bg-dracula-currentLine dark:text-dracula-fg'}`}
                    >
                      <div className="text-lg">{option.emoji}</div>
                      <div className="text-xs font-medium">{option.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-fridgit-text dark:text-dracula-fg">Expires in</label>
                {form.expiry_date && (
                  <span className="rounded-full bg-fridgit-accent/10 px-3 py-1 text-xs font-semibold text-fridgit-accent dark:bg-dracula-purple/20 dark:text-dracula-purple">
                    {new Date(`${form.expiry_date}T00:00:00`).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
              <div className="rounded-3xl border border-black/5 bg-white/90 p-3 shadow-soft dark:border-white/10 dark:bg-dracula-currentLine/70">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <div
                      ref={expiryNumberWheelRef}
                      onScroll={() => handleWheelScroll('number')}
                      className="h-14 overflow-y-auto rounded-2xl bg-fridgit-bg/80 px-2 py-3 text-center shadow-inner snap-y snap-mandatory dark:bg-dracula-bg"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                      }}
                    >
                      <div style={{ height: `${WHEEL_CENTER_OFFSET}px` }} aria-hidden="true" />
                      {numberWheelOptions.map((option) => {
                        const selected = option.value === expiryNumber;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setExpiryNumber(option.value)}
                            className={`block h-8 w-full snap-center rounded-xl text-sm font-semibold transition ${selected ? 'text-fridgit-text dark:text-dracula-fg' : 'text-fridgit-muted/70 dark:text-dracula-comment/80'}`}
                            aria-pressed={selected}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                      <div style={{ height: `${WHEEL_CENTER_OFFSET}px` }} aria-hidden="true" />
                    </div>
                    <div className="pointer-events-none absolute inset-x-2 top-1/2 h-8 -translate-y-1/2 rounded-xl border border-fridgit-accent/20 bg-fridgit-accent/10 dark:border-dracula-purple/30 dark:bg-dracula-purple/10" />
                  </div>
                  <div className="relative w-32">
                    <div
                      ref={expiryUnitWheelRef}
                      onScroll={() => handleWheelScroll('unit')}
                      className="h-14 overflow-y-auto rounded-2xl bg-fridgit-bg/80 px-2 py-3 text-center shadow-inner snap-y snap-mandatory dark:bg-dracula-bg"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                      }}
                    >
                      <div style={{ height: `${WHEEL_CENTER_OFFSET}px` }} aria-hidden="true" />
                      {unitWheelOptions.map((option) => {
                        const selected = option.value === expiryUnit;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setExpiryUnit(option.value)}
                            className={`block h-8 w-full snap-center rounded-xl text-sm font-semibold transition ${selected ? 'text-fridgit-text dark:text-dracula-fg' : 'text-fridgit-muted/70 dark:text-dracula-comment/80'}`}
                            aria-pressed={selected}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                      <div style={{ height: `${WHEEL_CENTER_OFFSET}px` }} aria-hidden="true" />
                    </div>
                    <div className="pointer-events-none absolute inset-x-2 top-1/2 h-8 -translate-y-1/2 rounded-xl border border-fridgit-accent/20 bg-fridgit-accent/10 dark:border-dracula-purple/30 dark:bg-dracula-purple/10" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-fridgit-muted dark:text-dracula-comment">
                  Scroll or tap either wheel to fine tune the estimated expiry date.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fridgit-text dark:text-dracula-fg">Storage location</label>
              <div className="flex flex-wrap gap-2">
                {locationOptions.map(option => {
                  const active = form.location === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateForm('location', option)}
                      className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${active ? 'bg-fridgit-text text-white shadow-soft dark:bg-dracula-purple dark:text-dracula-bg' : 'bg-fridgit-bg text-fridgit-muted hover:text-fridgit-text dark:bg-dracula-currentLine dark:text-dracula-comment dark:hover:text-dracula-fg'}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-fridgit-text dark:text-dracula-fg">Calories</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="1"
                  value={form.calories}
                  onChange={e => updateForm('calories', e.target.value)}
                  placeholder="per serving"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-fridgit-text dark:text-dracula-fg">Protein (g)</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.protein}
                  onChange={e => updateForm('protein', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-fridgit-text dark:text-dracula-fg">Carbs (g)</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.carbs}
                  onChange={e => updateForm('carbs', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-fridgit-text dark:text-dracula-fg">Fat (g)</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.fat}
                  onChange={e => updateForm('fat', e.target.value)}
                />
              </div>
            </div>

            {user && (
              <div>
                <label className="mb-2 block text-sm font-medium text-fridgit-text dark:text-dracula-fg">Sharing</label>
                <SharePicker
                  ownerUserId={user.id}
                  shared={form.shared}
                  sharedWith={form.shared_with}
                  onSharedChange={(value) => updateForm('shared', value)}
                  onSharedWithChange={(value) => updateForm('shared_with', value)}
                />
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Add item'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
