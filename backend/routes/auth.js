const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function signToken(user) {
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'Please provide name, email, and password' });
    }

    if (!EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: 'Password is too long' });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
    });
    await user.save();

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    // Handle race on unique email index
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    // Same message + similar timing whether or not the account exists
    const ok = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

module.exports = router;
