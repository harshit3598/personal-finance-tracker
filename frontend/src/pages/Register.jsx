import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI, getErrorMessage } from '../api';
import './Auth.css';

function Register({ onLogin, themeLabel, onToggleTheme }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.register(name.trim(), email.trim(), password);
      onLogin(response.data.token, response.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed'));
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
        <h2>Create your account</h2>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <input
            type="text"
            placeholder="Full Name"
            aria-label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
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
            placeholder="Password (min 6 characters)"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            aria-label="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
