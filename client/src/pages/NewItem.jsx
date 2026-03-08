import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Layout from '../components/Layout.jsx';
import SharePicker from '../components/SharePicker.jsx';
import { Camera, X, Search, ArrowLeft, Loader2, Package } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

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

function r2(val) {
  const n = parseFloat(val);
  if (val == null || val === '' || isNaN(n)) return '';
  return String(Math.round(n * 100) / 100);
}
function hasNutrition(v) { return v != null && v !== '' && v !== false; }

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
  const expiryNumberWheelRef = useRef(null);
  const expiryUnitWheelRef = useRef(null);
  const numberScrollTimeoutRef = useRef(null);
  const unitScrollTimeoutRef = useRef(null);
  const [form, setForm] = useState({
    name: '', barcode: '', category: 'other', quantity: 1, unit: 'count',
    location: 'fridge', expiry_date: '', calories: '', protein: '', carbs: '', fat: '',
    nutrition_basis: '100g',
    emoji: '\u{1F4E6}', color: '#F5F5F5', shared: false, image_url: '', shared_with: [],
  });
  const [expiryNumber, setExpiryNumber] = useState(3);
  const [expiryUnit, setExpiryUnit] = useState('days');

  const numberWheelOptions = useMemo(
    () => expiryNumberOptions.map((value) => ({ key: `number-${value}`, value, label: String(value) })),
    []
  );
  const unitWheelOptions = useMemo(
    () => expiryUnitOptions.map((option) => ({ key: `unit-${option.value}`, value: option.value, label: option.label })),
    []
  );

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const snapWheel = (ref, index) => {
    if (!ref.current) return;
    ref.current.scrollTo({ top: index * WHEEL_ROW_HEIGHT, behavior: 'smooth' });
  };

  const settleWheel = (type) => {
    const ref = type === 'number' ? expiryNumberWheelRef : expiryUnitWheelRef;
    const options = type === 'number' ? numberWheelOptions : unitWheelOptions;
    if (!ref.current || !options.length) return;
    const rawIndex = ref.current.scrollTop / WHEEL_ROW_HEIGHT;
    const index = Math.max(0, Math.min(options.length - 1, Math.round(rawIndex)));
    snapWheel(ref, index);
    if (type === 'number') setExpiryNumber(options[index].value);
    else setExpiryUnit(options[index].value);
  };

  const handleWheelScroll = (type) => {
    const timeoutRef = type === 'number' ? numberScrollTimeoutRef : unitScrollTimeoutRef;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => settleWheel(type), 80);
  };

  useEffect(() => {
    updateForm('expiry_date', addToDate(expiryNumber, expiryUnit));
  }, [expiryNumber, expiryUnit]);

  useEffect(() => {
    snapWheel(expiryNumberWheelRef, expiryNumber - 1);
  }, []);

  useEffect(() => {
    const unitIndex = unitWheelOptions.findIndex((option) => option.value === expiryUnit);
    if (unitIndex >= 0) snapWheel(expiryUnitWheelRef, unitIndex);
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

  useEffect(() => {
    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
      if (numberScrollTimeoutRef.current) clearTimeout(numberScrollTimeoutRef.current);
      if (unitScrollTimeoutRef.current) clearTimeout(unitScrollTimeoutRef.current);
    };
  }, []);

  const lookupBarcode = async (code) => {
    updateForm('barcode', code);
    setMode('form');
    try {
      const res = await api.get(`/barcode/${code}`);
      const p = res.data;
      setForm(prev => ({
        ...prev,
        name: p.name || prev.name,
        category: p.category || prev.category,
        calories: p.calories != null ? r2(p.calories) : prev.calories,
        protein: p.protein != null ? r2(p.protein) : prev.protein,
        carbs: p.carbs != null ? r2(p.carbs) : prev.carbs,
        fat: p.fat != null ? r2(p.fat) : prev.fat,
        nutrition_basis: p.nutrition_basis || prev.nutrition_basis,
        emoji: p.emoji || prev.emoji,
        color: p.color || prev.color,
        barcode: code,
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
    } catch {
      toast.error('Search failed');
    }
    setSearching(false);
  };

  const selectProduct = (product) => {
    setForm(prev => ({
      ...prev,
      name: product.name,
      category: product.category,
      calories: product.calories != null ? r2(product.calories) : prev.calories,
      protein: product.protein != null ? r2(product.protein) : prev.protein,
      carbs: product.carbs != null ? r2(product.carbs) : prev.carbs,
      fat: product.fat != null ? r2(product.fat) : prev.fat,
      nutrition_basis: product.nutrition_basis || prev.nutrition_basis,
      emoji: product.emoji || prev.emoji,
      color: product.color || prev.color,
      barcode: product.barcode || prev.barcode,
      image_url: product.image_url || prev.image_url,
    }));
    setMode('form');
    setSearchResults([]);
    toast.success(`Selected: ${product.name}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/items', {
        ...form,
        quantity: parseInt(form.quantity) || 1,
        calories: hasNutrition(form.calories) ? r2(form.calories) : null,
        protein: hasNutrition(form.protein) ? r2(form.protein) : null,
        carbs: hasNutrition(form.carbs) ? r2(form.carbs) : null,
        fat: hasNutrition(form.fat) ? r2(form.fat) : null,
        expiry_date: form.expiry_date || null,
        image_url: form.image_url || null,
        shared_with: form.shared_with,
      });
      toast.success('Item added!');
      navigate('/fridge');
    } catch {
      toast.error('Failed to add item');
    }
    setSaving(false);
  };

  if (mode === 'scan') {
    return (
      <Layout>
        <div className="slide-up">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-serif text-fridgit-text dark:text-dracula-fg">Scan Barcode</h1>
            <button onClick={stopScan} className="p-2 rounded-xl hover:bg-fridgit-surfaceAlt dark:hover:bg-dracula-surface transition-colors"><X size={20} /></button>
          </div>
          <div id="barcode-reader" className="rounded-xl overflow-hidden bg-black" style={{ minHeight: 300 }}></div>
          <p className="text-center text-sm text-fridgit-textMuted dark:text-dracula-comment mt-3">Point camera at a barcode</p>
        </div>
      </Layout>
    );
  }

  if (mode === 'search') {
    return (
      <Layout>
        <div className="slide-up">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setMode('form')} className="p-2 rounded-xl hover:bg-fridgit-surfaceAlt dark:hover:bg-dracula-surface transition-colors"><ArrowLeft size={20} /></button>
            <h1 className="text-xl font-serif text-fridgit-text dark:text-dracula-fg">Search Products</h1>
          </div>
          <div className="flex gap-2 mb-4">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchProducts()}
              placeholder="Search by name..." className="flex-1 px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-surface bg-white dark:bg-dracula-surface text-fridgit-text dark:text-dracula-fg focus:border-fridgit-primary dark:focus:border-dracula-green transition" />
            <button onClick={searchProducts} disabled={searching}
              className="px-4 py-2.5 rounded-xl bg-fridgit-primary dark:bg-dracula-green text-white dark:text-dracula-bg font-medium disabled:opacity-50">
              {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </div>
          <div className="space-y-2">
            {searchResults.map((p, i) => (
              <button key={i} onClick={() => selectProduct(p)}
                className="w-full bg-white dark:bg-dracula-surface rounded-xl border border-fridgit-border dark:border-dracula-line p-3 flex items-center gap-3 text-left hover:bg-fridgit-surfaceAlt dark:hover:bg-dracula-highlight transition-colors">
                {p.image_url ? <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <span className="text-2xl">{p.emoji || '\u{1F4E6}'}</span>}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-fridgit-text dark:text-dracula-fg text-sm truncate">{p.name}</div>
                  <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment">{p.category} {hasNutrition(p.calories) ? `- ${r2(p.calories)} kcal` : ''}</div>
                </div>
              </button>
            ))}
            {searchResults.length === 0 && !searching && searchQuery && (
              <p className="text-center text-sm text-fridgit-textMuted dark:text-dracula-comment py-8">No results. Try different keywords.</p>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="slide-up">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-fridgit-surfaceAlt dark:hover:bg-dracula-surface transition-colors"><ArrowLeft size={20} className="text-fridgit-text dark:text-dracula-fg" /></button>
          <h1 className="text-xl font-serif text-fridgit-text dark:text-dracula-fg">Add Item</h1>
        </div>

        <div className="flex gap-3 mb-4">
          <button onClick={startScan} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-fridgit-primary dark:border-dracula-green text-fridgit-primary dark:text-dracula-green font-medium hover:bg-fridgit-primaryPale dark:hover:bg-dracula-green/10 transition-colors">
            <Camera size={20} /> Scan Barcode
          </button>
          <button onClick={() => setMode('search')} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-fridgit-primary dark:border-dracula-green text-fridgit-primary dark:text-dracula-green font-medium hover:bg-fridgit-primaryPale dark:hover:bg-dracula-green/10 transition-colors">
            <Search size={20} /> Search
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white dark:bg-dracula-surface rounded-xl border border-fridgit-border dark:border-dracula-line p-4 space-y-3">
            {form.image_url && (
              <div className="flex justify-center">
                <img src={form.image_url} alt="Product" className="w-24 h-24 rounded-2xl object-cover border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Name</label>
              <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg focus:border-fridgit-primary dark:focus:border-dracula-green transition"
                placeholder="e.g. Greek Yogurt" />
            </div>

            <div>
              <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-2">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {categoryOptions.map(cat => (
                  <button key={cat.key} type="button" onClick={() => { updateForm('category', cat.key); updateForm('emoji', cat.emoji); }}
                    className={`p-2.5 rounded-xl border-2 transition-all ${form.category === cat.key ? 'border-fridgit-primary dark:border-dracula-green bg-fridgit-primaryPale dark:bg-dracula-green/10' : 'border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg hover:border-fridgit-primary/50 dark:hover:border-dracula-green/50'}`}>
                    <div className="text-lg mb-0.5">{cat.emoji}</div>
                    <div className="text-xs font-medium text-fridgit-text dark:text-dracula-fg">{cat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Quantity</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateForm('quantity', Math.max(1, parseInt(form.quantity) - 1 || 1))}
                    className="w-10 h-10 rounded-xl bg-fridgit-surfaceAlt dark:bg-dracula-highlight text-fridgit-text dark:text-dracula-fg flex items-center justify-center font-bold">-</button>
                  <input type="number" min="1" value={form.quantity} onChange={e => updateForm('quantity', e.target.value)}
                    className="h-10 flex-1 text-center px-3 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg" />
                  <button type="button" onClick={() => updateForm('quantity', (parseInt(form.quantity) || 0) + 1)}
                    className="w-10 h-10 rounded-xl bg-fridgit-surfaceAlt dark:bg-dracula-highlight text-fridgit-text dark:text-dracula-fg flex items-center justify-center font-bold">+</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Location</label>
                <select value={form.location} onChange={e => updateForm('location', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg capitalize">
                  {locationOptions.map(loc => <option key={loc} value={loc} className="capitalize">{loc}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Expiry Date</label>
              <div className="rounded-2xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg p-3 shadow-sm">
                <div className="mb-3">
                  <div className="text-xs font-medium text-fridgit-textMuted dark:text-dracula-comment mb-2">Quick expiry</div>
                  <div className="flex items-center gap-2 rounded-xl border border-fridgit-border dark:border-dracula-line bg-white/80 dark:bg-dracula-surface px-2 py-2 shadow-inner overflow-hidden">
                    <div className="relative w-20 shrink-0 rounded-lg bg-fridgit-bg dark:bg-dracula-bg overflow-hidden">
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-fridgit-bg dark:from-dracula-bg to-transparent" />
                      <div className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-8 -translate-y-1/2 rounded-md border border-fridgit-primary/20 dark:border-dracula-green/25 bg-fridgit-primary/5 dark:bg-dracula-green/10" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3 bg-gradient-to-t from-fridgit-bg dark:from-dracula-bg to-transparent" />
                      <div
                        ref={expiryNumberWheelRef}
                        onScroll={() => handleWheelScroll('number')}
                        className="overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-y"
                        style={{ height: `${WHEEL_VIEWPORT_HEIGHT}px`, paddingTop: `${WHEEL_CENTER_OFFSET}px`, paddingBottom: `${WHEEL_CENTER_OFFSET}px`, WebkitOverflowScrolling: 'touch' }}
                      >
                        {numberWheelOptions.map((option, index) => {
                          const isSelected = option.value === expiryNumber;
                          return (
                            <div
                              key={option.key}
                              className={`flex snap-center items-center justify-center px-2 text-center select-none transition-all ${
                                isSelected
                                  ? 'text-xl font-semibold text-fridgit-primary dark:text-dracula-green'
                                  : 'text-sm text-fridgit-textMuted dark:text-dracula-comment opacity-45'
                              }`}
                              style={{ height: `${WHEEL_ROW_HEIGHT}px` }}
                              onClick={() => {
                                setExpiryNumber(option.value);
                                snapWheel(expiryNumberWheelRef, index);
                              }}
                            >
                              {option.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="relative min-w-0 flex-1 rounded-lg bg-fridgit-bg dark:bg-dracula-bg overflow-hidden">
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-fridgit-bg dark:from-dracula-bg to-transparent" />
                      <div className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-8 -translate-y-1/2 rounded-md border border-fridgit-primary/20 dark:border-dracula-green/25 bg-fridgit-primary/5 dark:bg-dracula-green/10" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3 bg-gradient-to-t from-fridgit-bg dark:from-dracula-bg to-transparent" />
                      <div
                        ref={expiryUnitWheelRef}
                        onScroll={() => handleWheelScroll('unit')}
                        className="overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-y"
                        style={{ height: `${WHEEL_VIEWPORT_HEIGHT}px`, paddingTop: `${WHEEL_CENTER_OFFSET}px`, paddingBottom: `${WHEEL_CENTER_OFFSET}px`, WebkitOverflowScrolling: 'touch' }}
                      >
                        {unitWheelOptions.map((option, index) => {
                          const isSelected = option.value === expiryUnit;
                          return (
                            <div
                              key={option.key}
                              className={`flex snap-center items-center justify-center px-3 text-center select-none transition-all ${
                                isSelected
                                  ? 'text-base font-semibold text-fridgit-primary dark:text-dracula-green'
                                  : 'text-sm text-fridgit-textMuted dark:text-dracula-comment opacity-45'
                              }`}
                              style={{ height: `${WHEEL_ROW_HEIGHT}px` }}
                              onClick={() => {
                                setExpiryUnit(option.value);
                                snapWheel(expiryUnitWheelRef, index);
                              }}
                            >
                              {option.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-fridgit-border dark:border-dracula-line bg-white/80 dark:bg-dracula-surface p-3 overflow-hidden">
                  <div className="text-xs font-medium text-fridgit-textMuted dark:text-dracula-comment mb-2">Or pick an exact date</div>
                  <input type="date" value={form.expiry_date} onChange={e => updateForm('expiry_date', e.target.value)}
                    className="block w-full min-w-0 px-3 py-3 rounded-lg border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg focus:border-fridgit-primary dark:focus:border-dracula-green transition shadow-sm" />
                </div>
              </div>
            </div>

            <SharePicker
              shared={form.shared}
              sharedWith={form.shared_with}
              currentUserId={user?.id}
              onChange={({ shared, sharedWith }) => setForm(prev => ({ ...prev, shared, shared_with: sharedWith }))}
            />
          </div>

          {(hasNutrition(form.calories) || hasNutrition(form.protein) || hasNutrition(form.carbs) || hasNutrition(form.fat)) && (
            <div className="bg-white dark:bg-dracula-surface rounded-xl border border-fridgit-border dark:border-dracula-line p-4">
              <h3 className="text-sm font-semibold text-fridgit-textMid dark:text-dracula-comment mb-2">Nutrition ({form.nutrition_basis === 'serving' ? 'per serving' : 'per 100g'})</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-fridgit-bg dark:bg-dracula-bg rounded-lg p-2">
                  <div className="text-sm font-bold text-fridgit-text dark:text-dracula-fg">{hasNutrition(form.calories) ? r2(form.calories) : '-'}</div>
                  <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">kcal</div>
                </div>
                <div className="bg-fridgit-bg dark:bg-dracula-bg rounded-lg p-2">
                  <div className="text-sm font-bold text-fridgit-text dark:text-dracula-fg">{hasNutrition(form.protein) ? r2(form.protein) : '-'}</div>
                  <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Protein</div>
                </div>
                <div className="bg-fridgit-bg dark:bg-dracula-bg rounded-lg p-2">
                  <div className="text-sm font-bold text-fridgit-text dark:text-dracula-fg">{hasNutrition(form.carbs) ? r2(form.carbs) : '-'}</div>
                  <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Carbs</div>
                </div>
                <div className="bg-fridgit-bg dark:bg-dracula-bg rounded-lg p-2">
                  <div className="text-sm font-bold text-fridgit-text dark:text-dracula-fg">{hasNutrition(form.fat) ? r2(form.fat) : '-'}</div>
                  <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Fat</div>
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl bg-fridgit-primary dark:bg-dracula-green text-white dark:text-dracula-bg font-semibold hover:bg-fridgit-primaryLight dark:hover:bg-dracula-green/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Package size={20} />}
            Add to Fridge
          </button>
        </form>
      </div>
    </Layout>
  );
}
