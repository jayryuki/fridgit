import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { LogIn, Loader2, ChefHat } from 'lucide-react';
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
      toast.success('Welcome back!');
      navigate('/home');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-fridgit-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-fridgit-primaryPale rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChefHat size={32} className="text-fridgit-primary" />
          </div>
          <h1 className="text-3xl font-serif text-fridgit-text">Welcome Back</h1>
          <p className="text-fridgit-textMuted mt-1">Sign in to your Fridgit account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-fridgit-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-fridgit-textMid mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary focus:ring-1 focus:ring-fridgit-primary transition" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-fridgit-textMid mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-xl border border-fridgit-border bg-fridgit-bg text-fridgit-text focus:border-fridgit-primary focus:ring-1 focus:ring-fridgit-primary transition" placeholder="Enter password" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-fridgit-primary text-white font-semibold hover:bg-fridgit-primaryLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
            Sign In
          </button>
        </form>

        <p className="text-center mt-4 text-fridgit-textMid text-sm">
          Don't have an account? <Link to="/register" className="text-fridgit-primary font-semibold hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
