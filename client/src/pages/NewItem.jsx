import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
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

function r2(val) {
  const n = parseFloat(val);
  if (val == null || val === '' || isNaN(n)) return '';
  return String(Math.round(n * 100) / 100);
}
function hasNutrition(v) { return v != null && v !== '' && v !== false; }

export default function NewItem() {
  const navigate = useNavigate();
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
    nutrition_basis: '100g',
    emoji: '\u{1F4E6}', color: '#F5F5F5', shared: false, image_url: '',
  });

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

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
        calories: p.calories != null ? r2(p.calories) : prev.calories,
        protein: p.protein != null ? r2(p.protein) : prev.protein,
        carbs: p.carbs != null ? r2(p.carbs) : prev.carbs,
        fat: p.fat != null ? r2(p.fat) : prev.fat,
        nutrition_basis: p.nutrition_basis || prev.nutrition_basis,
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
      calories: product.calories != null ? r2(product.calories) : prev.calories,
      protein: product.protein != null ? r2(product.protein) : prev.protein,
      carbs: product.carbs != null ? r2(product.carbs) : prev.carbs,
      fat: product.fat != null ? r2(product.fat) : prev.fat,
      nutrition_basis: product.nutrition_basis || prev.nutrition_basis,
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
        calories: hasNutrition(form.calories) ? r2(form.calories) : null,
        protein: hasNutrition(form.protein) ? r2(form.protein) : null,
        carbs: hasNutrition(form.carbs) ? r2(form.carbs) : null,
        fat: hasNutrition(form.fat) ? r2(form.fat) : null,
        expiry_date: form.expiry_date || null,
        image_url: form.image_url || null,
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

        {/* Scan / Search buttons */}
        <div className="flex gap-3 mb-4">
          <button onClick={startScan} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-fridgit-primary dark:border-dracula-green text-fridgit-primary dark:text-dracula-green font-medium hover:bg-fridgit-primaryPale dark:hover:bg-dracula-green/10 transition-colors">
            <Camera size={20} /> Scan Barcode
          </button>
          <button onClick={() => setMode('search')} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-fridgit-primary dark:border-dracula-green text-fridgit-primary dark:text-dracula-green font-medium hover:bg-fridgit-primaryPale dark:hover:bg-dracula-green/10 transition-colors">
            <Search size={20} /> Search Product
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main form */}
          <div className="bg-white dark:bg-dracula-surface rounded-xl border border-fridgit-border dark:border-dracula-line p-4 space-y-4">
            {form.image_url && (
              <div className="flex justify-center">
                <img src={form.image_url} alt={form.name || 'Product'} className="w-24 h-24 rounded-xl object-cover border border-fridgit-border dark:border-dracula-line" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Name *</label>
              <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg focus:border-fridgit-primary dark:focus:border-dracula-green transition"
                placeholder="e.g. Milk" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Category</label>
                <select value={form.category} onChange={e => {
                  const selected = categoryOptions.find(c => c.key === e.target.value);
                  updateForm('category', e.target.value);
                  updateForm('emoji', selected?.emoji || '\u{1F4E6}');
                }}
                  className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg">
                  {categoryOptions.map(cat => <option key={cat.key} value={cat.key}>{cat.emoji} {cat.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Quantity</label>
                <input type="number" min="1" value={form.quantity} onChange={e => updateForm('quantity', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg"
                  placeholder="1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Unit</label>
                <input type="text" value={form.unit} onChange={e => updateForm('unit', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg"
                  placeholder="count" />
              </div>
              <div>
                <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Location</label>
                <select value={form.location} onChange={e => updateForm('location', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg capitalize">
                  {locationOptions.map(loc => <option key={loc} value={loc} className="capitalize">{loc}</option>)}
                </select>
              </div>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-comment mb-1">Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={e => updateForm('expiry_date', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg focus:border-fridgit-primary dark:focus:border-dracula-green transition" />
            </div>

            {/* Shared toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">Shared with household</span>
              <button type="button" onClick={() => updateForm('shared', !form.shared)}
                className={`w-12 h-6 rounded-full transition-colors ${form.shared ? 'bg-fridgit-primary dark:bg-dracula-green' : 'bg-fridgit-border dark:bg-dracula-line'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${form.shared ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Nutrition info */}
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
