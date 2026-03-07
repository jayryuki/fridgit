import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/home');
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-fridgit-bg flex items-center justify-center px-4">
      <div className="max-w-sm w-full slide-up">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif text-fridgit-primary">Fridgit</h1>
          <p className="text-fridgit-textMuted mt-1">Sign in to your fridge</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-fridgit-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-fridgit-textMid mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-fridgit-textMid mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary transition" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-fridgit-primary text-white font-semibold hover:bg-fridgit-primaryLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={20} className="animate-spin" />} Sign In
          </button>
          <p className="text-center text-sm text-fridgit-textMuted">
            Don't have an account? <Link to="/register" className="text-fridgit-primary font-medium hover:underline">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}