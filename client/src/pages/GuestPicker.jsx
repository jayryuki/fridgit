import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { UserPlus, Loader2, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const COLORS = [
  'bg-fridgit-primary', 'bg-fridgit-accent', 'bg-fridgit-danger',
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500',
];

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function GuestPicker() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(null);
  const { guestLogin, guestRegister } = useAuth();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handlePickUser = async (userId) => {
    setLoggingIn(userId);
    try {
      await guestLogin(userId);
      toast.success('Welcome back!');
      navigate('/home');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
    setLoggingIn(null);
  };

  const handleAddPerson = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      await guestRegister(newName.trim());
      toast.success(`Welcome, ${newName.trim()}!`);
      navigate('/home');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add person');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-fridgit-bg dark:bg-dracula-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-fridgit-primaryPale dark:bg-dracula-currentLine rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChefHat size={32} className="text-fridgit-primary dark:text-dracula-green" />
          </div>
          <h1 className="text-3xl font-serif text-fridgit-text dark:text-dracula-fg">Fridgit</h1>
          <p className="text-fridgit-textMuted dark:text-dracula-comment mt-1">Who's using the fridge?</p>
        </div>

        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <Loader2 size={28} className="animate-spin text-fridgit-primary dark:text-dracula-green" />
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u, i) => (
              <button
                key={u.id}
                onClick={() => handlePickUser(u.id)}
                disabled={loggingIn !== null}
                className="w-full flex items-center gap-4 p-4 bg-white dark:bg-dracula-currentLine rounded-2xl shadow-sm border border-fridgit-border dark:border-dracula-currentLine hover:border-fridgit-primary dark:hover:border-dracula-green hover:shadow-md transition-all disabled:opacity-50"
              >
                <div className={`w-12 h-12 ${COLORS[i % COLORS.length]} rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                  {loggingIn === u.id ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    getInitials(u.name)
                  )}
                </div>
                <span className="text-lg font-medium text-fridgit-text dark:text-dracula-fg">{u.name}</span>
              </button>
            ))}

            {!showAdd ? (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-fridgit-border dark:border-dracula-comment text-fridgit-textMuted dark:text-dracula-comment hover:border-fridgit-primary dark:hover:border-dracula-green hover:text-fridgit-primary dark:hover:text-dracula-green transition-colors"
              >
                <UserPlus size={20} />
                <span className="font-medium">Add new person</span>
              </button>
            ) : (
              <form onSubmit={handleAddPerson} className="bg-white dark:bg-dracula-currentLine rounded-2xl shadow-sm border border-fridgit-border dark:border-dracula-currentLine p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-fridgit-textMid dark:text-dracula-fg mb-1">Your name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    autoFocus
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-comment bg-fridgit-bg dark:bg-dracula-bg text-fridgit-text dark:text-dracula-fg focus:border-fridgit-primary dark:focus:border-dracula-green focus:ring-1 focus:ring-fridgit-primary dark:focus:ring-dracula-green transition"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setNewName(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-fridgit-border dark:border-dracula-comment text-fridgit-textMid dark:text-dracula-comment font-medium hover:bg-fridgit-bg dark:hover:bg-dracula-bg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !newName.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-fridgit-primary dark:bg-dracula-green text-white font-semibold hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                    Join
                  </button>
                </div>
              </form>
            )}

            {users.length === 0 && !showAdd && (
              <p className="text-center text-fridgit-textMuted dark:text-dracula-comment text-sm mt-2">
                No one here yet. Add yourself to get started!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
