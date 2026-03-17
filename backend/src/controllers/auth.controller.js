const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const db = require('../config/database');
const smsService = require('../services/sms.service');
const logger = require('../config/logger');

// Validation rules
exports.requestOtpRules = [
  body('phone').matches(/^254\d{9}$/).withMessage('Phone must be in 254XXXXXXXXX format (12 digits)'),
  validate,
];

exports.verifyOtpRules = [
  body('phone').matches(/^254\d{9}$/).withMessage('Phone must be in 254XXXXXXXXX format'),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  validate,
];

exports.updateProfileRules = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('email').optional().isEmail().normalizeEmail(),
  validate,
];

const OTP_EXPIRY_MINUTES = 5;
const OTP_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate a 6-digit OTP.
 */
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * POST /auth/otp/request
 */
exports.requestOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    // Check cooldown — prevent spamming
    const existingUser = await db('users').where({ phone }).first();
    if (existingUser && existingUser.otp_expires_at) {
      const lastOtpTime = new Date(existingUser.otp_expires_at).getTime() - (OTP_EXPIRY_MINUTES * 60 * 1000);
      const secondsSinceLastOtp = (Date.now() - lastOtpTime) / 1000;
      if (secondsSinceLastOtp < OTP_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(OTP_COOLDOWN_SECONDS - secondsSinceLastOtp);
        return res.status(429).json({
          message: `Please wait ${waitSeconds} seconds before requesting another code`,
        });
      }
    }

    const code = generateOtp();
    const hashedCode = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Upsert user
    if (existingUser) {
      await db('users').where({ id: existingUser.id }).update({
        otp_code: hashedCode,
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        updated_at: new Date(),
      });
    } else {
      await db('users')
        .insert({
          phone,
          otp_code: hashedCode,
          otp_expires_at: expiresAt,
          otp_attempts: 0,
          role: 'landlord',
        });
    }

    // Send OTP via HostPinnacle SMS
    const smsResult = await smsService.sendOtp(phone, code);
    if (!smsResult.success) {
      logger.error('OTP SMS failed:', { phone, error: smsResult.error });
      // Still respond success to not leak info, but log the failure
    }

    logger.info('OTP requested', { phone });
    res.json({ message: 'Verification code sent to your phone' });
  } catch (err) {
    logger.error('OTP request error:', err);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
};

/**
 * POST /auth/otp/verify
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;

    const user = await db('users').where({ phone }).first();
    if (!user || !user.otp_code) {
      return res.status(401).json({ message: 'No pending verification for this number' });
    }

    // Check brute-force attempts
    if (user.otp_attempts >= MAX_OTP_ATTEMPTS) {
      // Clear OTP — force re-request
      await db('users').where({ id: user.id }).update({
        otp_code: null,
        otp_expires_at: null,
        otp_attempts: 0,
        updated_at: new Date(),
      });
      return res.status(429).json({ message: 'Too many failed attempts. Request a new code.' });
    }

    // Check expiry
    if (new Date() > new Date(user.otp_expires_at)) {
      await db('users').where({ id: user.id }).update({
        otp_code: null,
        otp_expires_at: null,
        updated_at: new Date(),
      });
      return res.status(401).json({ message: 'Code expired. Request a new one.' });
    }

    // Verify OTP hash
    const isValid = await bcrypt.compare(code, user.otp_code);
    if (!isValid) {
      // Increment attempt counter
      await db('users').where({ id: user.id }).update({
        otp_attempts: (user.otp_attempts || 0) + 1,
        updated_at: new Date(),
      });
      const remaining = MAX_OTP_ATTEMPTS - (user.otp_attempts || 0) - 1;
      return res.status(401).json({
        message: `Invalid code. ${remaining} attempts remaining.`,
      });
    }

    // Clear OTP on success
    await db('users').where({ id: user.id }).update({
      otp_code: null,
      otp_expires_at: null,
      otp_attempts: 0,
      updated_at: new Date(),
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    logger.error('OTP verify error:', err);
    res.status(500).json({ message: 'Verification failed' });
  }
};

/**
 * GET /auth/profile
 */
exports.getProfile = async (req, res) => {
  res.json({ user: req.user });
};

/**
 * PUT /auth/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = { updated_at: new Date() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;

    await db('users').where({ id: req.user.id }).update(updates);

    const user = await db('users').where({ id: req.user.id }).first();
    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    logger.error('Profile update error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};
