import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { authAPI } from './api';
import './App.css';

const THEME_ORDER = ['light', 'dark', 'black', 'system'];
const THEME_LABELS = {
  light: '☀️ Light',
  dark: '🌙 Dark',
  black: '⬛ Black',
  system: '🖥️ System',
};

/** Read JSON from localStorage without crashing on corrupt data */
function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [user, setUser] = useState(readStoredUser);
  const [checkingSession, setCheckingSession] = useState(!!localStorage.getItem('token'));
  // User preference: light | dark | black | system
  const [themePref, setThemePref] = useState(() => {
    const stored = localStorage.getItem('theme');
    return THEME_ORDER.includes(stored) ? stored : 'light';
  });
  // Whether the OS prefers dark (used when themePref === 'system')
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  );

  // Live-follow the OS color scheme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Resolve the preference to an actual theme, then apply it to <html>
  const theme = themePref === 'system' ? (systemDark ? 'dark' : 'light') : themePref;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    if (theme === 'dark' || theme === 'black') {
      root.setAttribute('data-dark', 'true');
    } else {
      root.removeAttribute('data-dark');
    }
    localStorage.setItem('theme', themePref);
  }, [theme, themePref]);

  // Cycle: light → dark → black → system → light
  const toggleTheme = useCallback(() => {
    setThemePref((prev) => {
      const idx = THEME_ORDER.indexOf(prev);
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
  }, []);
  const themeLabel = THEME_LABELS[themePref] || THEME_LABELS.light;

  // Validate stored session against the server on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCheckingSession(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await authAPI.getMe();
        if (!cancelled) {
          setUser({
            id: response.data._id,
            name: response.data.name,
            email: response.data.email,
          });
          localStorage.setItem('user', JSON.stringify(response.data));
          setIsAuthenticated(true);
        }
      } catch {
        // Token invalid/expired — the 401 interceptor clears storage;
        // also fall back to stored user data if the API is unreachable (offline dev).
        if (!cancelled) {
          if (localStorage.getItem('token')) {
            const stored = readStoredUser();
            if (stored) setUser(stored);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Show a minimal splash while validating the session to avoid login-page flicker
  if (checkingSession) {
    return (
      <div className="app-splash" role="status" aria-label="Loading application">
        <div className="app-splash-logo">💰</div>
        <div className="app-splash-spinner" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} themeLabel={themeLabel} onToggleTheme={toggleTheme} />} />
        <Route path="/register" element={<Register onLogin={handleLogin} themeLabel={themeLabel} onToggleTheme={toggleTheme} />} />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Dashboard user={user} onLogout={handleLogout} theme={theme} themeLabel={themeLabel} onToggleTheme={toggleTheme} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
