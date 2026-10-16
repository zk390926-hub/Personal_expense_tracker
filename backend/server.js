// server.js – Entry point for the Personal Expense Tracker backend.
// Starts an Express REST API server on the configured port.

'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const app  = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow all common local development origins so the app works whether the
// frontend is opened via file://, VS Code Live Server, http-server, or Vite.
const DEV_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (file://, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow if it matches .env FRONTEND_ORIGIN or any DEV_ORIGINS entry
    const envOrigin = process.env.FRONTEND_ORIGIN;
    if ((envOrigin && origin === envOrigin) || DEV_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // In development (no NODE_ENV=production), allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Request logging (dev format) ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Initialise database connection ────────────────────────────────────────────
require('./config/database'); // triggers pool creation + connectivity check

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/categories',   require('./routes/categories'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets',      require('./routes/budgets'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/reports',      require('./routes/reports'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

// ── Global error handler ──────────────────────────────────────────────────────
// Do NOT expose internal error details to clients.
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Expense Tracker API running at http://localhost:${PORT}`);
  console.log(`    Press Ctrl+C to stop.`);
});
