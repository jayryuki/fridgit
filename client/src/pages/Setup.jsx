import { useState } from 'react';
import { Database, CheckCircle, XCircle, Loader2, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function Setup({ onComplete }) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    host: 'localhost', port: '5432', user: 'postgres', password: '', database: 'fridgit', spoonacularKey: ''
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/setup/test', { host: config.host, port: config.port, user: config.user, password: config.password });
      setTestResult(res.data);
      if (res.data.success) toast.success('Connection successful!');
      else toast.error(res.data.message);
    } catch (err) {
      setTestResult({ success: false, message: 'Failed to reach server' });
      toast.error('Failed to reach server');
    }
    setTesting(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await api.post('/setup/configure', config);
      if (res.data.success) {
        toast.success('Setup complete!');
        onComplete();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error('Configuration failed');
    }
    setSaving(false);
  };

  if (step === 0) {
    return (
      <div className="min-h-screen bg-fridgit-bg flex items-center justify-center p-4">
        <div className="text-center slide-up">
          <div className="w-20 h-20 bg-fridgit-primaryPale rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ChefHat size={40} className="text-fridgit-primary" />
          </div>
          <h1 className="text-4xl font-serif text-fridgit-text mb-2">Fridgit</h1>
          <p className="text-fridgit-textMid mb-8 max-w-xs mx-auto">Your smart fridge companion. Track inventory, scan barcodes, discover recipes.</p>
          <button onClick={() => setStep(1)} className="bg-fridgit-primary text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-fridgit-primaryLight transition-colors">
            Get Started
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fridgit-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-fridgit-border p-6 w-full max-w-md slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-fridgit-primaryPale rounded-xl flex items-center justify-center">
            <Database size={20} className="text-fridgit-primary" />
          </div>
          <div>
            <h2 className="text-xl font-serif text-fridgit-text">Database Setup</h2>
            <p className="text-sm text-fridgit-textMuted">Connect your PostgreSQL server</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-fridgit-textMid mb-1">Host</label>
              <input type="text" value={config.host} onChange={e => setConfig({...config, host: e.target.value})}
                className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary focus:ring-1 focus:ring-fridgit-primary transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-fridgit-textMid mb-1">Port</label>
              <input type="text" value={config.port} onChange={e => setConfig({...config, port: e.target.value})}
                className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary focus:ring-1 focus:ring-fridgit-primary transition" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-fridgit-textMid mb-1">Username</label>
            <input type="text" value={config.user} onChange={e => setConfig({...config, user: e.target.value})}
              className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary focus:ring-1 focus:ring-fridgit-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-fridgit-textMid mb-1">Password</label>
            <input type="password" value={config.password} onChange={e => setConfig({...config, password: e.target.value})}
              className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary focus:ring-1 focus:ring-fridgit-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-fridgit-textMid mb-1">Database Name</label>
            <input type="text" value={config.database} onChange={e => setConfig({...config, database: e.target.value})}
              className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary focus:ring-1 focus:ring-fridgit-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-fridgit-textMid mb-1">Spoonacular API Key <span className="text-fridgit-textMuted font-normal">(optional)</span></label>
            <input type="text" value={config.spoonacularKey} onChange={e => setConfig({...config, spoonacularKey: e.target.value})} placeholder="Enables recipe suggestions"
              className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text placeholder:text-fridgit-textMuted focus:border-fridgit-primary focus:ring-1 focus:ring-fridgit-primary transition" />
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${testResult.success ? 'bg-fridgit-primaryPale text-fridgit-primary' : 'bg-fridgit-dangerPale text-fridgit-danger'}`}>
              {testResult.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
              {testResult.success ? 'Connection successful!' : testResult.message}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={testConnection} disabled={testing || !config.host || !config.user}
              className="flex-1 py-2.5 rounded-xl border-2 border-fridgit-primary text-fridgit-primary font-semibold hover:bg-fridgit-primaryPale transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {testing ? <Loader2 size={18} className="animate-spin" /> : null}
              Test
            </button>
            <button onClick={saveConfig} disabled={saving || !testResult?.success}
              className="flex-1 py-2.5 rounded-xl bg-fridgit-primary text-white font-semibold hover:bg-fridgit-primaryLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={18} className="animate-spin" /> : null}
              Save & Initialize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
