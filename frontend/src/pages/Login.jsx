import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI, getErrorMessage } from '../api';
import './Auth.css';

function Login({ onLogin, themeLabel, onToggleTheme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login(email.trim(), password);
      onLogin(response.data.token, response.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <button
        onClick={onToggleTheme}
        className="theme-toggle-btn theme-toggle-float"
        title="Theme: Light → Dark → Black → System"
      >
        {themeLabel}
      </button>
      <div className="auth-card">
        <h1>💰 Expense Tracker</h1>
        <h2>Welcome back</h2>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <input
            type="email"
            placeholder="Email"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
        <p>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
