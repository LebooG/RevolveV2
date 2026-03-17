require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const routes = require('./routes');
const { startJobs } = require('./jobs/scheduler');
const { validateEnvVars, sanitizeBody } = require('./middleware/security');

// Validate all required env vars before anything else
validateEnvVars();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed for correct IP detection behind Nginx)
app.set('trust proxy', 1);

// ─── Security & Middleware ────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8081',
    'https://revolverent.com',
    'https://api.revolverent.com',
    /\.onrender\.com$/,   // Render test domains
    /\.expo\.dev$/,       // Expo dev client
  ],
  credentials: true,
}));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeBody);

// Rate limiting (100 requests per 15 min per IP)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { message: 'Too many requests, please try again later.' },
  // Exclude M-Pesa callback from rate limiting
  skip: (req) => req.path.includes('/mpesa/callback') || req.path.includes('/mpesa/timeout'),
});
app.use('/api/', limiter);

// ─── Health Check ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'revolve-rent-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── API Routes ───────────────────────────────────────────
app.use('/api/v1', routes);

// ─── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Revolve Rent API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start cron jobs
  if (process.env.NODE_ENV !== 'test') {
    startJobs();
  }
});

module.exports = app;
