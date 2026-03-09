import { useState, useEffect } from 'react';
import { Users, Globe, Loader2, UserPlus, Check, X } from 'lucide-react';
import api from '../services/api.js';

const COLORS = [
  'bg-fridgit-primary', 'bg-fridgit-accent', 'bg-fridgit-danger',
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500',
];

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function SharePicker({ shared, sharedWith, currentUserId, onChange }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchUsers = () => {
    api.get('/auth/users')
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const otherUsers = users.filter(u => u.id !== currentUserId);

  const toggleShared = () => {
    if (!shared) {
      onChange({ shared: true, sharedWith: [] });
    } else {
      onChange({ shared: false, sharedWith: sharedWith });
    }
  };

  const toggleUser = (userId) => {
    const current = sharedWith || [];
    const next = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId];
    onChange({ shared, sharedWith: next });
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    setAddError('');
    try {
      const res = await api.post('/auth/members', { name: trimmed });
      const newUser = res.data;
      setUsers(prev => [...prev, newUser].sort((a, b) => a.name.localeCompare(b.name)));
      const current = sharedWith || [];
      onChange({ shared, sharedWith: [...current, newUser.id] });
      setNewName('');
      setShowAddForm(false);
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 size={16} className="animate-spin text-fridgit-textMuted dark:text-dracula-comment" />
        <span className="text-sm text-fridgit-textMuted dark:text-dracula-comment">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-fridgit-textMid dark:text-dracula-comment" />
          <span className="text-sm font-medium text-fridgit-textMid dark:text-dracula-comment">Share with everyone</span>
        </div>
        <button type="button" onClick={toggleShared}
          className={`w-12 h-6 rounded-full transition-colors ${shared ? 'bg-fridgit-primary dark:bg-dracula-green' : 'bg-fridgit-border dark:bg-dracula-line'}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${shared ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className={shared ? 'opacity-40 pointer-events-none' : ''}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-fridgit-textMuted dark:text-dracula-comment" />
            <span className="text-xs font-medium text-fridgit-textMuted dark:text-dracula-comment uppercase tracking-wide">
              Or share with specific people
            </span>
          </div>
          {!showAddForm && (
            <button
              type="button"
              onClick={() => { setShowAddForm(true); setAddError(''); }}
              className="flex items-center gap-1 text-xs font-medium text-fridgit-primary dark:text-dracula-green hover:opacity-80 transition-opacity"
            >
              <UserPlus size={13} />
              Add
            </button>
          )}
        </div>

        {showAddForm && (
          <form onSubmit={handleAddMember} className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={newName}
              onChange={e => { setNewName(e.target.value); setAddError(''); }}
              placeholder="Member name..."
              autoFocus
              className="flex-1 text-sm px-3 py-1.5 rounded-xl border border-fridgit-border dark:border-dracula-line bg-fridgit-surface dark:bg-dracula-surface text-fridgit-text dark:text-dracula-fg placeholder:text-fridgit-textMuted dark:placeholder:text-dracula-comment focus:outline-none focus:ring-2 focus:ring-fridgit-primary/30 dark:focus:ring-dracula-green/30"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="p-1.5 rounded-lg bg-fridgit-primary dark:bg-dracula-green text-white disabled:opacity-40 transition-opacity"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewName(''); setAddError(''); }}
              className="p-1.5 rounded-lg bg-fridgit-surfaceAlt dark:bg-dracula-surface text-fridgit-textMuted dark:text-dracula-comment hover:text-fridgit-text dark:hover:text-dracula-fg transition-colors"
            >
              <X size={14} />
            </button>
          </form>
        )}
        {addError && (
          <p className="text-xs text-fridgit-danger dark:text-dracula-red mb-2">{addError}</p>
        )}

        {otherUsers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {otherUsers.map((u, i) => {
              const isSelected = (sharedWith || []).includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-fridgit-primary dark:bg-dracula-green text-white dark:text-dracula-bg shadow-sm'
                      : 'bg-fridgit-surfaceAlt dark:bg-dracula-surface text-fridgit-textMid dark:text-dracula-fg border border-fridgit-border dark:border-dracula-line hover:border-fridgit-primary dark:hover:border-dracula-green'
                  }`}
                >
                  <div className={`w-6 h-6 ${isSelected ? 'bg-white/30' : COLORS[i % COLORS.length]} rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                    {getInitials(u.name)}
                  </div>
                  {u.name}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <Users size={24} className="mx-auto mb-2 text-fridgit-textMuted/50 dark:text-dracula-comment/50" />
            <p className="text-xs text-fridgit-textMuted dark:text-dracula-comment">
              No household members yet.
            </p>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => { setShowAddForm(true); setAddError(''); }}
                className="mt-2 text-xs font-medium text-fridgit-primary dark:text-dracula-green hover:opacity-80 transition-opacity flex items-center gap-1 mx-auto"
              >
                <UserPlus size={13} />
                Add your first member
              </button>
            )}
          </div>
        )}
      </div>

      {!shared && (sharedWith || []).length > 0 && (
        <p className="text-xs text-fridgit-textMuted dark:text-dracula-comment">
          Shared with {sharedWith.length} {sharedWith.length === 1 ? 'person' : 'people'}
        </p>
      )}
    </div>
  );
}
