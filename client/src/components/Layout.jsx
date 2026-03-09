import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Refrigerator, ShoppingCart, UtensilsCrossed, Settings } from 'lucide-react';

const navItems = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/fridge', icon: Refrigerator, label: 'Fridge' },
  { path: '/shopping', icon: ShoppingCart, label: 'Shop' },
  { path: '/recipes', icon: UtensilsCrossed, label: 'Recipes' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

function applyDarkMode() {
  const dark = localStorage.getItem('fridgit_dark_mode') === 'true';
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    applyDarkMode();
    const handler = () => applyDarkMode();
    window.addEventListener('fridgit-theme-change', handler);
    return () => window.removeEventListener('fridgit-theme-change', handler);
  }, []);

  return (
    <div className="min-h-screen bg-fridgit-bg dark:bg-dracula-bg flex flex-col md:flex-row transition-colors">

      {/* Sleek Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white/70 dark:bg-dracula-currentLine/60 backdrop-blur-xl border-r border-fridgit-border dark:border-dracula-line/50 transition-colors shrink-0 sticky top-0 h-screen overflow-y-auto pt-8 px-4 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="font-bold text-2xl text-fridgit-primary dark:text-dracula-green mb-10 px-2 flex items-center gap-3">
          <Refrigerator className="w-8 h-8" />
          <span className="tracking-tight">Fridgit</span>
        </div>
        <div className="flex flex-col gap-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`group flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all w-full text-left font-medium ${
                  active
                    ? 'bg-fridgit-primary/10 dark:bg-dracula-selection text-fridgit-primary dark:text-dracula-green shadow-sm'
                    : 'text-fridgit-textMuted dark:text-dracula-comment hover:bg-black/5 dark:hover:bg-dracula-selection/50 hover:text-fridgit-textMid dark:hover:text-dracula-fg'
                }`}
              >
                <Icon size={24} strokeWidth={active ? 2.5 : 2} className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:-rotate-3'}`} />
                <span className="text-base">{label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 pt-6 md:pt-8 transition-all relative">
        {children}
      </main>

      {/* Floating Glassmorphism Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-dracula-currentLine/85 backdrop-blur-xl border-t border-white/20 dark:border-dracula-line/50 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)] transition-colors">
        <div className="w-full flex justify-around items-center pt-2 px-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`relative flex flex-col items-center gap-1 min-w-[4rem] px-2 py-1 rounded-xl transition-all duration-300 ${
                  active
                    ? 'text-fridgit-primary dark:text-dracula-green -translate-y-1'
                    : 'text-fridgit-textMuted dark:text-dracula-comment hover:text-fridgit-textMid dark:hover:text-dracula-fg'
                }`}
              >
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${active ? 'bg-fridgit-primary/15 dark:bg-dracula-selection/80 shadow-inner' : 'bg-transparent'}`}>
                  <Icon size={active ? 24 : 22} strokeWidth={active ? 2.5 : 2} className="transition-transform" />
                </div>
                <span className={`text-[10px] font-semibold tracking-wide transition-opacity ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}