import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect, createContext, useContext } from 'react';
import api from './services/api.js';

// Pages
import Setup from './pages/Setup.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import GuestPicker from './pages/GuestPicker.jsx';
import HomePage from './pages/Home.jsx';
import FridgePage from './pages/Fridge.jsx';
import MealPlanningPage from './pages/MealPlanning.jsx';
import NewItem from './pages/NewItem.jsx';
import ShoppingList from './pages/ShoppingList.jsx';
import SettingsPage from './pages/Settings.jsx';

// Auth mode context so any component can check secure vs insecure
const AuthModeContext = createContext({ secure: true });
export const useAuthMode = () => useContext(AuthModeContext);

function ProtectedRoute({ children, secureMode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-fridgit-textMuted">Loading...</div>;
  if (!isAuthenticated) {
    return <Navigate to={secureMode ? '/login' : '/pick-user'} />;
  }
  return children;
}

function AppRoutes() {
  const [configured, setConfigured] = useState(null);
  const [secureMode, setSecureMode] = useState(true);
  const [modeLoaded, setModeLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/setup/status').then(res => setConfigured(res.data.configured)).catch(() => setConfigured(false)),
      api.get('/auth/mode').then(res => setSecureMode(res.data.secure)).catch(() => setSecureMode(true)),
    ]).finally(() => setModeLoaded(true));
  }, []);

  if (configured === null || !modeLoaded) {
    return <div className="flex items-center justify-center h-screen text-fridgit-textMuted">Loading...</div>;
  }

  if (!configured) {
    return (
      <Routes>
        <Route path="*" element={<Setup onComplete={() => setConfigured(true)} />} />
      </Routes>
    );
  }

  return (
    <AuthModeContext.Provider value={{ secure: secureMode }}>
      <Routes>
        {secureMode ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </>
        ) : (
          <Route path="/pick-user" element={<GuestPicker />} />
        )}
        <Route path="/home" element={<ProtectedRoute secureMode={secureMode}><HomePage /></ProtectedRoute>} />
        <Route path="/fridge" element={<ProtectedRoute secureMode={secureMode}><FridgePage /></ProtectedRoute>} />
        <Route path="/meal-planning" element={<ProtectedRoute secureMode={secureMode}><MealPlanningPage /></ProtectedRoute>} />
        <Route path="/new-item" element={<ProtectedRoute secureMode={secureMode}><NewItem /></ProtectedRoute>} />
        <Route path="/shopping" element={<ProtectedRoute secureMode={secureMode}><ShoppingList /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute secureMode={secureMode}><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </AuthModeContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '12px', background: '#1A2A1E', color: '#fff', fontSize: '14px' } }} containerStyle={{ top: 'env(safe-area-inset-top)' }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
