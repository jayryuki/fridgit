import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Layout from '../components/Layout.jsx';
import { User, Bell, Shield, LogOut, Save, Loader2, Moon } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings').then(r => {
      setSettings(r.data);
      // Sync dark mode from server settings on load
      if (r.data.dark_mode) {
        localStorage.setItem('fridgit_dark_mode', 'true');
      } else {
        localStorage.setItem('fridgit_dark_mode', 'false');
      }
      window.dispatchEvent(new Event('fridgit-theme-change'));
    }).catch(() => toast.error('Failed to load settings')).finally(() => setLoading(false));
  }, []);

  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const toggleDarkMode = () => {
    const newVal = !settings.dark_mode;
    updateSetting('dark_mode', newVal);
    localStorage.setItem('fridgit_dark_mode', String(newVal));
    window.dispatchEvent(new Event('fridgit-theme-change'));
  };

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

  if (loading) return <Layout><div className="text-center py-12 text-fridgit-textMuted dark:text-dracula-comment">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="slide-up max-w-3xl mx-auto">
        <h1 className="text-2xl font-serif text-fridgit-text dark:text-dracula-fg mb-6">Settings</h1>

        {/* Profile */}
        <div className="bg-white dark:bg-dracula-surface rounded-xl border border-fridgit-border dark:border-dracula-line p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-fridgit-primaryPale dark:bg-dracula-green/20 flex items-center justify-center">
              <User size={24} className="text-fridgit-primary dark:text-dracula-green" />
            </div>
            <div>
              <h3 className="font-semibold text-fridgit-text dark:text-dracula-fg">{user?.name || 'User'}</h3>
              <p className="text-sm text-fridgit-textMuted dark:text-dracula-comment">{user?.email || ''}</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {settings && (
          <div className="bg-white dark:bg-dracula-surface rounded-xl border border-fridgit-border dark:border-dracula-line p-4 mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-fridgit-text dark:text-dracula-fg mb-3">
              <Bell size={18} className="text-fridgit-primary dark:text-dracula-green" /> Notifications
            </h3>
            <div className="space-y-3">
              {[
                { key: 'notif_expiry', label: 'Expiry warnings', desc: 'Notify when items are about to expire' },
                { key: 'notif_recommend', label: 'Recommendations', desc: 'Recipe suggestions based on your fridge' },
                { key: 'notif_shared', label: 'Shared updates', desc: 'When household members add items' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-fridgit-text dark:text-dracula-fg">{label}</div>
                    <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment">{desc}</div>
                  </div>
                  <button onClick={() => updateSetting(key, !settings[key])}
                    className={`w-12 h-6 rounded-full transition-colors ${settings[key] ? 'bg-fridgit-primary dark:bg-dracula-green' : 'bg-fridgit-border dark:bg-dracula-line'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preferences */}
        {settings && (
          <div className="bg-white dark:bg-dracula-surface rounded-xl border border-fridgit-border dark:border-dracula-line p-4 mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-fridgit-text dark:text-dracula-fg mb-3">
              <Shield size={18} className="text-fridgit-primary dark:text-dracula-green" /> Preferences
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-fridgit-text dark:text-dracula-fg flex items-center gap-1.5">
                    <Moon size={14} className="text-fridgit-primary dark:text-dracula-purple" /> Dark mode
                  </div>
                  <div className="text-xs text-fridgit-textMuted dark:text-dracula-comment">Dracula theme</div>
                </div>
                <button onClick={toggleDarkMode}
                  className={`w-12 h-6 rounded-full transition-colors ${settings.dark_mode ? 'bg-dracula-purple' : 'bg-fridgit-border dark:bg-dracula-line'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.dark_mode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-fridgit-text dark:text-dracula-fg">Expiry warning</div>
                  <span className="text-sm font-bold text-fridgit-primary dark:text-dracula-green">{settings.expiry_warning_days} days</span>
                </div>
                <input type="range" min="1" max="14" value={settings.expiry_warning_days} onChange={e => updateSetting('expiry_warning_days', parseInt(e.target.value))}
                  className="w-full accent-fridgit-primary dark:accent-dracula-purple" />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button onClick={saveSettings} disabled={saving}
            className="w-full py-3 rounded-xl bg-fridgit-primary dark:bg-dracula-green text-white dark:text-dracula-bg font-semibold hover:bg-fridgit-primaryLight dark:hover:bg-dracula-green/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            Save Settings
          </button>
          <button onClick={handleLogout}
            className="w-full py-3 rounded-xl border-2 border-fridgit-danger dark:border-dracula-red text-fridgit-danger dark:text-dracula-red font-semibold hover:bg-fridgit-dangerPale dark:hover:bg-dracula-red/10 transition-colors flex items-center justify-center gap-2">
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </div>
    </Layout>
  );
}
