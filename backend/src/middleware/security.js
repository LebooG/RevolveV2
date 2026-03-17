const logger = require('../config/logger');

/**
 * Safaricom M-Pesa IP ranges.
 * These are the known IPs that Safaricom uses for callbacks.
 * Update if Safaricom publishes new ranges.
 */
const MPESA_ALLOWED_IPS = [
  '196.201.214.',   // Safaricom range
  '196.201.212.',
  '196.201.213.',
  '196.201.215.',
  '198.172.10.',
  '41.215.160.',
  '127.0.0.1',      // localhost for testing
  '::1',            // IPv6 localhost
  '::ffff:127.0.0.1',
];

/**
 * Restrict M-Pesa callback endpoints to Safaricom IPs only.
 * In production, unknown IPs are blocked.
 * In development/sandbox, all IPs are allowed with a warning.
 */
const mpesaIpWhitelist = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || '';
  const forwardedFor = req.headers['x-forwarded-for'] || '';
  const realIp = forwardedFor.split(',')[0].trim() || clientIp;

  const isAllowed = MPESA_ALLOWED_IPS.some((prefix) => realIp.startsWith(prefix));

  if (!isAllowed) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('M-Pesa callback blocked: unauthorized IP', { ip: realIp });
      return res.status(403).json({ message: 'Forbidden' });
    } else {
      // In dev/sandbox, log warning but allow through
      logger.warn('M-Pesa callback from non-Safaricom IP (allowed in dev)', { ip: realIp });
    }
  }

  next();
};

/**
 * Validate required environment variables on startup.
 * Call this once at server boot.
 */
const validateEnvVars = () => {
  const required = [
    'JWT_SECRET',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_PASSKEY',
    'MPESA_SHORTCODE',
    'MPESA_CALLBACK_URL',
    'HOSTPINNACLE_USER_ID',
    'HOSTPINNACLE_PASSWORD',
  ];

  // Need either DATABASE_URL or individual DB vars
  if (!process.env.DATABASE_URL) {
    required.push('DB_HOST', 'DB_NAME', 'DB_USER');
  }

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing);
    console.error('\n  FATAL: Missing environment variables:\n');
    missing.forEach((key) => console.error(`    - ${key}`));
    console.error('\n  Copy .env.example to .env and fill in all values.\n');
    process.exit(1);
  }

  // Warn if JWT_SECRET is too short
  if (process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET is shorter than 32 characters. Generate a stronger one.');
  }

  // Warn if still using default placeholder
  if (process.env.JWT_SECRET.includes('change_this') || process.env.JWT_SECRET.includes('your_')) {
    logger.error('JWT_SECRET is still a placeholder. Generate a real secret.');
    console.error('\n  FATAL: JWT_SECRET is a placeholder. Run:\n');
    console.error('    node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n');
    process.exit(1);
  }
};

/**
 * Sanitize request body — strip any fields starting with $ to prevent
 * NoSQL-style injection in case of misconfiguration.
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach((key) => {
      if (key.startsWith('$')) {
        delete req.body[key];
      }
    });
  }
  next();
};

module.exports = { mpesaIpWhitelist, validateEnvVars, sanitizeBody };
