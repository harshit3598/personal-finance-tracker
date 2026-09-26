require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// --- Trust proxy (safe behind reverse proxies / tunnels) ---
app.set('trust proxy', 1);

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// --- Basic in-memory rate limiting on auth endpoints (brute-force protection) ---
const loginAttempts = new Map(); // ip -> { count, resetAt }
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

function rateLimitAuth(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    loginAttempts.set(ip, entry);
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
  }
  next();
}

// --- MongoDB Connection ---
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('The API cannot work without a database. Exiting.');
    process.exit(1);
  });

// Notify on DB disconnects instead of failing silently
mongoose.connection.on('disconnected', () => {
  console.error('⚠️ MongoDB disconnected');
});
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// --- Routes ---
app.use('/api/auth', rateLimitAuth, require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/ai', require('./routes/ai')); // AI Expense Categorizer
app.use('/api/agent', require('./routes/agent')); // Financial Advisor Agent
app.use('/api/multi-agent', require('./routes/multiAgent')); // Multi-Agent System

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Expense Tracker API is running 🚀' });
});

// Health check for monitoring / uptime probes
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? 'ok' : 'degraded',
    database: dbState === 1 ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 404 for unknown API routes (JSON, not HTML)
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Malformed JSON body handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Catch-all error handler (ensures JSON, never HTML stack traces)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- Graceful shutdown ---
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed. Goodbye.');
      process.exit(0);
    } catch (err) {
      process.exit(0);
    }
  });
  // Force-exit if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Keep the process alive on unexpected promise rejections, but log loudly
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
