// Create a router for contact us page
const express = require('express');
const router = express.Router();
const { contactUs, submitContactUs } = require('../controllers/contactusController');

// Simple in-memory rate limiter per IP for Contact Us
// Limits to 5 requests per 10 minutes per IP
const rateBuckets = new Map();
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5;

function contactRateLimit(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  rateBuckets.set(ip, recent);
  if (recent.length > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
}

// Contact us page
router.get('/', contactUs);

// Submit contact us message
router.post('/', contactRateLimit, submitContactUs);

module.exports = router;
