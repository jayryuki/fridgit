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

export default function NewItem() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('form'); // 'form' | 'scan' | 'search'
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const scannerRef = useRef(null);
  const [form, setForm] = useState({
    name: '', barcode: '', category: 'other', quantity: 1, unit: 'count',
    location: 'fridge', expiry_date: '', calories: '', protein: '', carbs: '', fat: '',
    emoji: '\u{1F4E6}', color: '#F5F5F5', shared: false,
  });

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // Barcode scanning
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
        calories: p.calories || '', protein: p.protein || '', carbs: p.carbs || '', fat: p.fat || '',
        emoji: p.emoji || prev.emoji, color: p.color || prev.color, barcode: code,
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
      ...prev, name: product.name, category: product.category, calories: product.calories || '',
      protein: product.protein || '', carbs: product.carbs || '', fat: product.fat || '',
      emoji: product.emoji || prev.emoji, color: product.color || prev.color,
      barcode: product.barcode || prev.barcode,
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
        calories: form.calories ? parseInt(form.calories) : null,
        expiry_date: form.expiry_date || null,
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
            <h1 className="text-xl font-serif text-fridgit-text">Scan Barcode</h1>
            <button onClick={stopScan} className="p-2 rounded-xl hover:bg-fridgit-surfaceAlt transition-colors"><X size={20} /></button>
          </div>
          <div id="barcode-reader" className="rounded-xl overflow-hidden bg-black" style={{ minHeight: 300 }}></div>
          <p className="text-center text-sm text-fridgit-textMuted mt-3">Point camera at a barcode</p>
        </div>
      </Layout>
    );
  }

  if (mode === 'search') {
    return (
      <Layout>
        <div className="slide-up">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setMode('form')} className="p-2 rounded-xl hover:bg-fridgit-surfaceAlt transition-colors"><ArrowLeft size={20} /></button>
            <h1 className="text-xl font-serif text-fridgit-text">Search Products</h1>
          </div>
          <div className="flex gap-2 mb-4">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchProducts()}
              placeholder="Search by name..." className="flex-1 px-3 py-2.5 rounded-xl border border-fridgit-border bg-white text-fridgit-text focus:border-fridgit-primary transition" />
            <button onClick={searchProducts} disabled={searching}
              className="px-4 py-2.5 rounded-xl bg-fridgit-primary text-white font-medium disabled:opacity-50">
              {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </div>
          <div className="space-y-2">
            {searchResults.map((p, i) => (
              <button key={i} onClick={() => selectProduct(p)}
                className="w-full bg-white rounded-xl border border-fridgit-border p-3 flex items-center gap-3 text-left hover:bg-fridgit-surfaceAlt transition-colors">
                <span className="text-2xl">{p.emoji || '\u{1F4E6}'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-fridgit-text text-sm truncate">{p.name}</div>
                  <div className="text-xs text-fridgit-textMuted">{p.category} {p.calories ? `- ${p.calories} kcal` : ''}</div>
                </div>
              </button>
            ))}
            {searchResults.length === 0 && !searching && searchQuery && (
              <p className="text-center text-sm text-fridgit-textMuted py-8">No results. Try different keywords.</p>
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
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-fridgit-surfaceAlt transition-colors"><ArrowLeft size={20} className="text-fridgit-text" /></button>
          <h1 className="text-xl font-serif text-fridgit-text">Add Item</h1>
        </div>

        {/* Scan / Search buttons */}
        <div className="flex gap-3 mb-4">
          <button onClick={startScan} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-fridgit-primary text-fridgit-primary font-medium hover:bg-fridgit-primaryPale transition-colors">
            <Camera size={20} /> Scan Barcode
          </button>
          <button onClick={() => setMode('search')} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-fridgit-accent text-fridgit-accent font-medium hover:bg-fridgit-accentPale transition-colors">
            <Search size={20} /> Search
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-fridgit-border p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-fridgit-textMid mb-1">Name *</label>
              <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary transition" placeholder="e.g. Whole Milk" />
            </div>

            {/* Category chips */}
            <div>
              <label className="block text-sm font-medium text-fridgit-textMid mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map(cat => (
                  <button type="button" key={cat.key} onClick={() => { updateForm('category', cat.key); updateForm('emoji', cat.emoji); }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.category === cat.key ? 'bg-fridgit-primary text-white' : 'bg-fridgit-surfaceAlt text-fridgit-textMid hover:bg-fridgit-primaryPale'
                    }`}>
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-fridgit-textMid mb-1">Quantity</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateForm('quantity', Math.max(1, form.quantity - 1))}
                    className="w-9 h-9 rounded-lg bg-fridgit-surfaceAlt text-fridgit-text flex items-center justify-center font-bold">-</button>
                  <span className="w-10 text-center font-semibold text-fridgit-text">{form.quantity}</span>
                  <button type="button" onClick={() => updateForm('quantity', form.quantity + 1)}
                    className="w-9 h-9 rounded-lg bg-fridgit-surfaceAlt text-fridgit-text flex items-center justify-center font-bold">+</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-fridgit-textMid mb-1">Location</label>
                <select value={form.location} onChange={e => updateForm('location', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text capitalize">
                  {locationOptions.map(loc => <option key={loc} value={loc} className="capitalize">{loc}</option>)}
                </select>
              </div>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-fridgit-textMid mb-1">Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={e => updateForm('expiry_date', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary transition" />
            </div>

            {/* Shared toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-fridgit-textMid">Shared with household</span>
              <button type="button" onClick={() => updateForm('shared', !form.shared)}
                className={`w-12 h-6 rounded-full transition-colors ${form.shared ? 'bg-fridgit-primary' : 'bg-fridgit-border'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${form.shared ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Nutrition info (if available from scan) */}
          {(form.calories || form.protein || form.carbs || form.fat) && (
            <div className="bg-white rounded-xl border border-fridgit-border p-4">
              <h3 className="text-sm font-semibold text-fridgit-textMid mb-2">Nutrition (per 100g)</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-fridgit-bg rounded-lg p-2">
                  <div className="text-sm font-bold text-fridgit-text">{form.calories || '-'}</div>
                  <div className="text-[10px] text-fridgit-textMuted">kcal</div>
                </div>
                <div className="bg-fridgit-bg rounded-lg p-2">
                  <div className="text-sm font-bold text-fridgit-text">{form.protein || '-'}</div>
                  <div className="text-[10px] text-fridgit-textMuted">Protein</div>
                </div>
                <div className="bg-fridgit-bg rounded-lg p-2">
                  <div className="text-sm font-bold text-fridgit-text">{form.carbs || '-'}</div>
                  <div className="text-[10px] text-fridgit-textMuted">Carbs</div>
                </div>
                <div className="bg-fridgit-bg rounded-lg p-2">
                  <div className="text-sm font-bold text-fridgit-text">{form.fat || '-'}</div>
                  <div className="text-[10px] text-fridgit-textMuted">Fat</div>
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl bg-fridgit-primary text-white font-semibold hover:bg-fridgit-primaryLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Package size={20} />}
            Add to Fridge
          </button>
        </form>
      </div>
    </Layout>
  );
}
