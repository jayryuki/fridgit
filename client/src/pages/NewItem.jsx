import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Layout from '../components/Layout.jsx';
import SharePicker from '../components/SharePicker.jsx';
import { Camera, X, Search, ArrowLeft, Loader2, Package } from 'lucide-react';
import { categoryOptions, locationOptions } from '../utils/constants.js';
import { r2, r2Empty, hasNutrition } from '../utils/helpers.js';
import api from '../services/api.js';
import toast from 'react-hot-toast';

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
    name: '',
    barcode: '',
    category: 'other',
    quantity: 1,
    unit: 'count',
    location: 'fridge',
    expiry_date: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    nutrition_basis: '100g',
    emoji: '\u{1F4E6}',
    color: '#F5F5F5',
    shared: false,
    image_url: '',
    shared_with: [],
  });
  const [expiryNumber, setExpiryNumber] = useState(3);
  const [expiryUnit, setExpiryUnit] = useState('days');

  const numberWheelOptions = useMemo(() => expiryNumberOptions.map((value) => ({ key: `number-${value}`, value, label: String(value) })), []);
  const unitWheelOptions = useMemo(() => expiryUnitOptions.map((option) => ({ key: `unit-${option.value}`, value: option.value, label: option.label })), []);

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

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
    } catch {
      toast.error('Camera access denied or not available');
      setMode('form');
      setScanning(false);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
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
      setForm((prev) => ({
        ...prev,
        name: p.name || prev.name,
        category: p.category || prev.category,
        calories: p.calories != null ? r2Empty(p.calories) : prev.calories,
        protein: p.protein != null ? r2Empty(p.protein) : prev.protein,
        carbs: p.carbs != null ? r2Empty(p.carbs) : prev.carbs,
        fat: p.fat != null ? r2Empty(p.fat) : prev.fat,
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
    setForm((prev) => ({
      ...prev,
      name: product.name,
      category: product.category,
      calories: product.calories != null ? r2Empty(product.calories) : prev.calories,
      protein: product.protein != null ? r2Empty(product.protein) : prev.protein,
      carbs: product.carbs != null ? r2Empty(product.carbs) : prev.carbs,
      fat: product.fat != null ? r2Empty(product.fat) : prev.fat,
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
        calories: hasNutrition(form.calories) ? r2Empty(form.calories) : null,
        protein: hasNutrition(form.protein) ? r2Empty(form.protein) : null,
        carbs: hasNutrition(form.carbs) ? r2Empty(form.carbs) : null,
        fat: hasNutrition(form.fat) ? r2Empty(form.fat) : null,
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
        <div className="page-stack slide-up">
          <section className="panel-section mx-auto max-w-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-serif text-fridgit-text dark:text-dracula-fg">Scan Barcode</h1>
              <button onClick={stopScan} className="rounded-xl p-2 transition-colors hover:bg-fridgit-surfaceAlt dark:hover:bg-dracula-surface"><X size={20} /></button>
            </div>
            <div id="barcode-reader" className="overflow-hidden rounded-xl bg-black" style={{ minHeight: 320 }}></div>
            <p className="mt-3 text-center text-sm text-fridgit-textMuted dark:text-dracula-comment">Point camera at a barcode</p>
          </section>
        </div>
      </Layout>
    );
  }

  if (mode === 'search') {
    return (
      <Layout>
        <div className="page-stack slide-up">
          <section className="panel-section mx-auto max-w-4xl">
            <div className="mb-4 flex items-center gap-3">
              <button onClick={() => setMode('form')} className="rounded-xl p-2 transition-colors hover:bg-fridgit-surfaceAlt dark:hover:bg-dracula-surface"><ArrowLeft size={20} /></button>
              <h1 className="text-xl font-serif text-fridgit-text dark:text-dracula-fg">Search Products</h1>
            </div>
            <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchProducts()}
                placeholder="Search by name..."
                className="w-full rounded-xl border border-fridgit-border bg-white px-3 py-3 text-fridgit-text transition focus:border-fridgit-primary dark:border-dracula-line dark:bg-dracula-surface dark:text-dracula-fg dark:focus:border-dracula-green"
              />
              <button onClick={searchProducts} disabled={searching} className="rounded-xl bg-fridgit-primary px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-dracula-green dark:text-dracula-bg">
                {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {searchResults.map((p, i) => (
                <button
                  key={i}
                  onClick={() => selectProduct(p)}
                  className="flex w-full items-center gap-3 rounded-xl border border-fridgit-border bg-white p-3 text-left transition-colors hover:bg-fridgit-surfaceAlt dark:border-dracula-line dark:bg-dracula-surface dark:hover:bg-dracula-highlight"
                >
                  {p.image_url ? <img src={p.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <span className="text-2xl">{p.emoji || '\u{1F4E6}'}</span>}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-fridgit-text dark:text-dracula-fg">{p.name}</div>
                    <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment">{p.category} {hasNutrition(p.calories) ? `- ${r2(p.calories)} kcal` : ''}</div>
                  </div>
                </button>
              ))}
            </div>
            {searchResults.length === 0 && !searching && searchQuery && (
              <p className="py-8 text-center text-sm text-fridgit-textMuted dark:text-dracula-comment">No results. Try different keywords.</p>
            )}
          </section>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-stack slide-up">
        <section className="hero-card">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="rounded-xl p-2 transition-colors hover:bg-fridgit-surfaceAlt dark:hover:bg-dracula-surface"><ArrowLeft size={20} className="text-fridgit-text dark:text-dracula-fg" /></button>
              <div>
                <h1 className="text-3xl font-serif text-fridgit-text dark:text-dracula-fg sm:text-[2rem]">Add Item</h1>
                <p className="mt-1 text-sm text-fridgit-textMuted dark:text-dracula-comment">Capture groceries quickly on mobile and fill in details comfortably on desktop.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
              <button onClick={startScan} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-fridgit-primary py-3 font-medium text-fridgit-primary transition-colors hover:bg-fridgit-primaryPale dark:border-dracula-green dark:text-dracula-green dark:hover:bg-dracula-green/10">
                <Camera size={20} /> Scan Barcode
              </button>
              <button onClick={() => setMode('search')} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-fridgit-primary py-3 font-medium text-fridgit-primary transition-colors hover:bg-fridgit-primaryPale dark:border-dracula-green dark:text-dracula-green dark:hover:bg-dracula-green/10">
                <Search size={20} /> Search
              </button>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <section className="panel-section space-y-4">
              {form.image_url && (
                <div className="flex justify-center lg:justify-start">
                  <img src={form.image_url} alt="Product" className="h-28 w-28 rounded-2xl border border-fridgit-border bg-fridgit-bg object-cover dark:border-dracula-line dark:bg-dracula-bg" />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  required
                  className="w-full rounded-xl border border-fridgit-border bg-fridgit-bg px-3 py-3 text-fridgit-text transition focus:border-fridgit-primary dark:border-dracula-line dark:bg-dracula-bg dark:text-dracula-fg dark:focus:border-dracula-green"
                  placeholder="e.g. Greek Yogurt"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">Category</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => {
                        updateForm('category', cat.key);
                        updateForm('emoji', cat.emoji);
                      }}
                      className={`rounded-xl border-2 p-3 transition-all ${form.category === cat.key ? 'border-fridgit-primary bg-fridgit-primaryPale dark:border-dracula-green dark:bg-dracula-green/10' : 'border-fridgit-border bg-fridgit-bg hover:border-fridgit-primary/50 dark:border-dracula-line dark:bg-dracula-bg dark:hover:border-dracula-green/50'}`}
                    >
                      <div className="mb-1 text-lg">{cat.emoji}</div>
                      <div className="text-xs font-medium text-fridgit-text dark:text-dracula-fg">{cat.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateForm('quantity', Math.max(1, parseInt(form.quantity) - 1 || 1))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-fridgit-surfaceAlt font-bold text-fridgit-text dark:bg-dracula-highlight dark:text-dracula-fg">-</button>
                    <input type="number" min="1" value={form.quantity} onChange={(e) => updateForm('quantity', e.target.value)} className="h-11 flex-1 rounded-xl border border-fridgit-border bg-fridgit-bg px-3 text-center text-fridgit-text dark:border-dracula-line dark:bg-dracula-bg dark:text-dracula-fg" />
                    <button type="button" onClick={() => updateForm('quantity', (parseInt(form.quantity) || 0) + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-fridgit-surfaceAlt font-bold text-fridgit-text dark:bg-dracula-highlight dark:text-dracula-fg">+</button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">Location</label>
                  <select value={form.location} onChange={(e) => updateForm('location', e.target.value)} className="w-full rounded-xl border border-fridgit-border bg-fridgit-bg px-3 py-3 capitalize text-fridgit-text dark:border-dracula-line dark:bg-dracula-bg dark:text-dracula-fg">
                    {locationOptions.map((loc) => <option key={loc} value={loc} className="capitalize">{loc}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="panel-section">
              <label className="mb-3 block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">Expiry Date</label>
              <div className="rounded-2xl border border-fridgit-border bg-fridgit-bg p-3 shadow-sm dark:border-dracula-line dark:bg-dracula-bg">
                <div className="mb-3">
                  <div className="mb-2 text-xs font-medium text-fridgit-textMuted dark:text-dracula-comment">Quick expiry</div>
                  <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-fridgit-border bg-white/80 px-2 py-2 shadow-inner dark:border-dracula-line dark:bg-dracula-surface">
                    <div className="relative w-20 shrink-0 overflow-hidden rounded-lg bg-fridgit-bg dark:bg-dracula-bg">
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-fridgit-bg to-transparent dark:from-dracula-bg" />
                      <div className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-8 -translate-y-1/2 rounded-md border border-fridgit-primary/20 bg-fridgit-primary/5 dark:border-dracula-green/25 dark:bg-dracula-green/10" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3 bg-gradient-to-t from-fridgit-bg to-transparent dark:from-dracula-bg" />
                      <div ref={expiryNumberWheelRef} onScroll={() => handleWheelScroll('number')} className="touch-pan-y overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ height: `${WHEEL_VIEWPORT_HEIGHT}px`, paddingTop: `${WHEEL_CENTER_OFFSET}px`, paddingBottom: `${WHEEL_CENTER_OFFSET}px`, WebkitOverflowScrolling: 'touch' }}>
                        {numberWheelOptions.map((option, index) => {
                          const isSelected = option.value === expiryNumber;
                          return (
                            <div key={option.key} className={`flex snap-center select-none items-center justify-center px-2 text-center transition-all ${isSelected ? 'text-xl font-semibold text-fridgit-primary dark:text-dracula-green' : 'text-sm text-fridgit-textMuted opacity-45 dark:text-dracula-comment'}`} style={{ height: `${WHEEL_ROW_HEIGHT}px` }} onClick={() => { setExpiryNumber(option.value); snapWheel(expiryNumberWheelRef, index); }}>
                              {option.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg bg-fridgit-bg dark:bg-dracula-bg">
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-fridgit-bg to-transparent dark:from-dracula-bg" />
                      <div className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-8 -translate-y-1/2 rounded-md border border-fridgit-primary/20 bg-fridgit-primary/5 dark:border-dracula-green/25 dark:bg-dracula-green/10" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3 bg-gradient-to-t from-fridgit-bg to-transparent dark:from-dracula-bg" />
                      <div ref={expiryUnitWheelRef} onScroll={() => handleWheelScroll('unit')} className="touch-pan-y overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ height: `${WHEEL_VIEWPORT_HEIGHT}px`, paddingTop: `${WHEEL_CENTER_OFFSET}px`, paddingBottom: `${WHEEL_CENTER_OFFSET}px`, WebkitOverflowScrolling: 'touch' }}>
                        {unitWheelOptions.map((option, index) => {
                          const isSelected = option.value === expiryUnit;
                          return (
                            <div key={option.key} className={`flex snap-center select-none items-center justify-center px-2 text-center transition-all ${isSelected ? 'text-base font-semibold text-fridgit-primary dark:text-dracula-green' : 'text-sm text-fridgit-textMuted opacity-45 dark:text-dracula-comment'}`} style={{ height: `${WHEEL_ROW_HEIGHT}px` }} onClick={() => { setExpiryUnit(option.value); snapWheel(expiryUnitWheelRef, index); }}>
                              {option.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-fridgit-border bg-white/80 p-3 dark:border-dracula-line dark:bg-dracula-surface">
                  <div className="mb-2 text-xs font-medium text-fridgit-textMuted dark:text-dracula-comment">Or pick an exact date</div>
                  <input type="date" value={form.expiry_date} onChange={(e) => updateForm('expiry_date', e.target.value)} className="block w-full min-w-0 rounded-lg border border-fridgit-border bg-fridgit-bg px-3 py-3 text-fridgit-text shadow-sm transition focus:border-fridgit-primary dark:border-dracula-line dark:bg-dracula-bg dark:text-dracula-fg dark:focus:border-dracula-green" />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="panel-section">
              <SharePicker shared={form.shared} sharedWith={form.shared_with} currentUserId={user?.id} onChange={({ shared, sharedWith }) => setForm((prev) => ({ ...prev, shared, shared_with: sharedWith }))} />
            </section>

            {(hasNutrition(form.calories) || hasNutrition(form.protein) || hasNutrition(form.carbs) || hasNutrition(form.fat)) && (
              <section className="panel-section">
                <h3 className="mb-3 text-sm font-semibold text-fridgit-textMid dark:text-dracula-comment">Nutrition ({form.nutrition_basis === 'serving' ? 'per serving' : 'per 100g'})</h3>
                <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
                  <div className="rounded-lg bg-fridgit-bg p-3 dark:bg-dracula-bg">
                    <div className="text-base font-bold text-fridgit-text dark:text-dracula-fg">{hasNutrition(form.calories) ? r2(form.calories) : '-'}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">kcal</div>
                  </div>
                  <div className="rounded-lg bg-fridgit-bg p-3 dark:bg-dracula-bg">
                    <div className="text-base font-bold text-fridgit-text dark:text-dracula-fg">{hasNutrition(form.protein) ? r2(form.protein) : '-'}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Protein</div>
                  </div>
                  <div className="rounded-lg bg-fridgit-bg p-3 dark:bg-dracula-bg">
                    <div className="text-base font-bold text-fridgit-text dark:text-dracula-fg">{hasNutrition(form.carbs) ? r2(form.carbs) : '-'}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Carbs</div>
                  </div>
                  <div className="rounded-lg bg-fridgit-bg p-3 dark:bg-dracula-bg">
                    <div className="text-base font-bold text-fridgit-text dark:text-dracula-fg">{hasNutrition(form.fat) ? r2(form.fat) : '-'}</div>
                    <div className="text-[10px] text-fridgit-textMuted dark:text-dracula-comment">Fat</div>
                  </div>
                </div>
              </section>
            )}

            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-fridgit-primary py-3 font-semibold text-white transition-colors hover:bg-fridgit-primaryLight disabled:opacity-50 dark:bg-dracula-green dark:text-dracula-bg dark:hover:bg-dracula-green/80">
              {saving ? <Loader2 size={20} className="animate-spin" /> : <Package size={20} />}
              Add to Fridge
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
