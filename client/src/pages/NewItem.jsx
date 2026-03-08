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
];

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

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    updateForm('expiry_date', addToDate(expiryNumber, expiryUnit));
  }, [expiryNumber, expiryUnit]);

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
                  <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment">{p.category} {p.calories ? `- ${Math.round(Number(p.calories))} kcal` : ''}</div>
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
          <h1 className="text-2xl font-serif text-fridgit-text dark:text-dracula-fg">Add Item</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={startScan} className="glass-card p-3 rounded-2xl flex flex-col items-center justify-center gap-2 hover:shadow-fridgit transition-all">
            <Camera className="w-6 h-6 text-fridgit-primary dark:text-dracula-green" />
            <span className="text-sm font-medium text-fridgit-text dark:text-dracula-fg">Scan Barcode</span>
          </button>
          <button onClick={() => setMode('search')} className="glass-card p-3 rounded-2xl flex flex-col items-center justify-center gap-2 hover:shadow-fridgit transition-all">
            <Search className="w-6 h-6 text-fridgit-primary dark:text-dracula-green" />
            <span className="text-sm font-medium text-fridgit-text dark:text-dracula-fg">Search Food</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {form.image_url && (
            <div className="glass-card rounded-2xl p-4">
              <img src={form.image_url} alt={form.name || 'Selected product'} className="w-full h-48 object-cover rounded-xl" />
            </div>
          )}

          <div className="glass-card rounded-2xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-fridgit-text dark:text-dracula-fg mb-2">Item Name</label>
              <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g., Greek Yogurt" required
                className="input-field" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-fridgit-text dark:text-dracula-fg mb-2">Quantity</label>
                <input type="number" min="1" value={form.quantity} onChange={e => updateForm('quantity', e.target.value)}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-fridgit-text dark:text-dracula-fg mb-2">Unit</label>
                <select value={form.unit} onChange={e => updateForm('unit', e.target.value)} className="input-field">
                  <option value="count">count</option>
                  <option value="oz">oz</option>
                  <option value="lb">lb</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="cups">cups</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fridgit-text dark:text-dracula-fg mb-2">Location</label>
              <div className="grid grid-cols-4 gap-2">
                {locationOptions.map(loc => (
                  <button key={loc} type="button" onClick={() => updateForm('location', loc)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition-all ${form.location === loc ? 'bg-fridgit-primary dark:bg-dracula-green text-white dark:text-dracula-bg shadow-fridgit' : 'bg-fridgit-surfaceAlt dark:bg-dracula-surface text-fridgit-text dark:text-dracula-fg hover:bg-fridgit-primary/10 dark:hover:bg-dracula-green/10'}`}>
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fridgit-text dark:text-dracula-fg mb-2">Expiry</label>
              <div className="space-y-3">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,7rem)_minmax(0,1fr)]">
                  <select
                    value={expiryNumber}
                    onChange={e => setExpiryNumber(Number(e.target.value))}
                    className="input-field"
                    aria-label="Expiry amount"
                  >
                    {expiryNumberOptions.map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                  <select
                    value={expiryUnit}
                    onChange={e => setExpiryUnit(e.target.value)}
                    className="input-field"
                    aria-label="Expiry unit"
                  >
                    {expiryUnitOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="rounded-2xl border border-fridgit-border dark:border-dracula-line bg-fridgit-surfaceAlt/70 dark:bg-dracula-surface/70 p-3">
                  <label className="block text-xs font-medium uppercase tracking-wide text-fridgit-textMuted dark:text-dracula-comment mb-2">
                    Or choose a date
                  </label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={e => updateForm('expiry_date', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fridgit-text dark:text-dracula-fg mb-2">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {categoryOptions.map(cat => (
                  <button key={cat.key} type="button" onClick={() => {
                    updateForm('category', cat.key);
                    updateForm('emoji', cat.emoji);
                  }}
                    className={`glass-card rounded-xl px-3 py-2 flex flex-col items-center gap-1 transition-all ${form.category === cat.key ? 'ring-2 ring-fridgit-primary dark:ring-dracula-green shadow-fridgit' : ''}`}>
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-xs text-fridgit-text dark:text-dracula-fg">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 space-y-4">
            <h3 className="font-medium text-fridgit-text dark:text-dracula-fg flex items-center gap-2">
              <Package className="w-4 h-4" /> Nutrition (optional)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-fridgit-text dark:text-dracula-fg mb-2">Calories</label>
                <input type="number" min="0" step="1" value={form.calories} onChange={e => updateForm('calories', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-fridgit-text dark:text-dracula-fg mb-2">Protein (g)</label>
                <input type="number" min="0" step="0.1" value={form.protein} onChange={e => updateForm('protein', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-fridgit-text dark:text-dracula-fg mb-2">Carbs (g)</label>
                <input type="number" min="0" step="0.1" value={form.carbs} onChange={e => updateForm('carbs', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-fridgit-text dark:text-dracula-fg mb-2">Fat (g)</label>
                <input type="number" min="0" step="0.1" value={form.fat} onChange={e => updateForm('fat', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {user && <SharePicker enabled={form.shared} onToggle={(v) => updateForm('shared', v)} selected={form.shared_with} onChange={(ids) => updateForm('shared_with', ids)} />}

          <button type="submit" disabled={saving} className="w-full btn-primary py-4 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? (
              <span className="inline-flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Saving...</span>
            ) : 'Add to Fridge'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
