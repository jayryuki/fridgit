import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Layout from '../components/Layout.jsx';
import { User, Bell, Shield, LogOut, Save, Loader2 } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data)).catch(() => toast.error('Failed to load settings')).finally(() => setLoading(false));
  }, []);

  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings', settings);
      setSettings(res.data);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out');
  };

  if (loading) return <Layout><div className="text-center py-12 text-fridgit-textMuted">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="slide-up">
        <h1 className="text-2xl font-serif text-fridgit-text mb-6">Settings</h1>

        <div className="bg-white rounded-xl border border-fridgit-border p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-fridgit-primaryPale flex items-center justify-center">
              <User size={24} className="text-fridgit-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-fridgit-text">{user?.name || 'User'}</h3>
              <p className="text-sm text-fridgit-textMuted">{user?.email || ''}</p>
            </div>
          </div>
        </div>

        {settings && (
          <div className="bg-white rounded-xl border border-fridgit-border p-4 mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-fridgit-text mb-3">
              <Bell size={18} className="text-fridgit-primary" /> Notifications
            </h3>
            <div className="space-y-3">
              {[
                { key: 'notif_expiry', label: 'Expiry warnings', desc: 'Notify when items are about to expire' },
                { key: 'notif_recommend', label: 'Recommendations', desc: 'Recipe suggestions based on your fridge' },
                { key: 'notif_shared', label: 'Shared updates', desc: 'When household members add items' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-fridgit-text">{label}</div>
                    <div className="text-xs text-fridgit-textMuted">{desc}</div>
                  </div>
                  <button onClick={() => updateSetting(key, !settings[key])}
                    className={`w-12 h-6 rounded-full transition-colors ${settings[key] ? 'bg-fridgit-primary' : 'bg-fridgit-border'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {settings && (
          <div className="bg-white rounded-xl border border-fridgit-border p-4 mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-fridgit-text mb-3">
              <Shield size={18} className="text-fridgit-primary" /> Preferences
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-fridgit-text">Dark mode</div>
                  <div className="text-xs text-fridgit-textMuted">Coming soon</div>
                </div>
                <button onClick={() => updateSetting('dark_mode', !settings.dark_mode)}
                  className={`w-12 h-6 rounded-full transition-colors ${settings.dark_mode ? 'bg-fridgit-primary' : 'bg-fridgit-border'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.dark_mode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-fridgit-text">Expiry warning</div>
                  <span className="text-sm font-bold text-fridgit-primary">{settings.expiry_warning_days} days</span>
                </div>
                <input type="range" min="1" max="14" value={settings.expiry_warning_days} onChange={e => updateSetting('expiry_warning_days', parseInt(e.target.value))}
                  className="w-full accent-fridgit-primary" />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button onClick={saveSettings} disabled={saving}
            className="w-full py-3 rounded-xl bg-fridgit-primary text-white font-semibold hover:bg-fridgit-primaryLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            Save Settings
          </button>
          <button onClick={handleLogout}
            className="w-full py-3 rounded-xl border-2 border-fridgit-danger text-fridgit-danger font-semibold hover:bg-fridgit-dangerPale transition-colors flex items-center justify-center gap-2">
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </div>
    </Layout>
  );
}