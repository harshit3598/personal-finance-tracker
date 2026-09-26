const jwt = require('jsonwebtoken');

/**
 * Authentication middleware.
 * Expects: Authorization: Bearer <token>
 * On success attaches req.userId (string) and continues.
 */
const auth = (req, res, next) => {
  try {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured — refusing to verify tokens.');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;
