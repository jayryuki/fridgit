import { useState } from 'react';
import { Loader2, Database, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function Setup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [form, setForm] = useState({ host: 'localhost', port: '5432', user: 'postgres', password: '', database: 'fridgit', spoonacularKey: '' });

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/setup/test', form);
      setTestResult(res.data);
      if (res.data.success) toast.success('Connection successful!');
      else toast.error(res.data.message);
    } catch { toast.error('Failed to test connection'); }
    setTesting(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await api.post('/setup/configure', form);
      if (res.data.success) {
        toast.success('Setup complete!');
        onComplete();
      } else {
        toast.error(res.data.message);
      }
    } catch { toast.error('Configuration failed'); }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-fridgit-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-fridgit-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Database size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-serif text-fridgit-text">Welcome to Fridgit</h1>
          <p className="text-fridgit-textMuted mt-2">Let's set up your database connection</p>
        </div>

        {step === 1 && (
          <div className="bg-white rounded-2xl border border-fridgit-border p-6 space-y-4">
            <h2 className="font-serif text-lg text-fridgit-text">PostgreSQL Connection</h2>
            {['host', 'port', 'user', 'password', 'database'].map(field => (
              <div key={field}>
                <label className="block text-sm font-medium text-fridgit-textMid mb-1 capitalize">{field}</label>
                <input type={field === 'password' ? 'password' : 'text'} value={form[field]} onChange={e => updateForm(field, e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary transition" />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={testConnection} disabled={testing}
                className="flex-1 py-2.5 rounded-xl border-2 border-fridgit-primary text-fridgit-primary font-semibold hover:bg-fridgit-primaryPale transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {testing ? <Loader2 size={18} className="animate-spin" /> : null} Test
              </button>
              <button onClick={() => setStep(2)} disabled={!testResult?.success}
                className="flex-1 py-2.5 rounded-xl bg-fridgit-primary text-white font-semibold hover:bg-fridgit-primaryLight transition-colors disabled:opacity-50">
                Next
              </button>
            </div>
            {testResult && (
              <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-fridgit-primary' : 'text-fridgit-danger'}`}>
                {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {testResult.success ? 'Connected!' : testResult.message}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl border border-fridgit-border p-6 space-y-4">
            <h2 className="font-serif text-lg text-fridgit-text">Optional: Recipe API</h2>
            <p className="text-sm text-fridgit-textMuted">Add a Spoonacular API key to enable recipe suggestions. You can skip this and add it later.</p>
            <div>
              <label className="block text-sm font-medium text-fridgit-textMid mb-1">Spoonacular API Key</label>
              <input type="text" value={form.spoonacularKey} onChange={e => updateForm('spoonacularKey', e.target.value)} placeholder="Optional"
                className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary transition" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border-2 border-fridgit-border text-fridgit-textMid font-semibold hover:bg-fridgit-surfaceAlt transition-colors">Back</button>
              <button onClick={saveConfig} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-fridgit-primary text-white font-semibold hover:bg-fridgit-primaryLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={18} className="animate-spin" /> : null} Finish Setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}