const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const { mpesaIpWhitelist } = require('../middleware/security');

// Controllers
const authCtrl = require('../controllers/auth.controller');
const propertyCtrl = require('../controllers/property.controller');
const tenantCtrl = require('../controllers/tenant.controller');
const paymentCtrl = require('../controllers/payment.controller');
const leaseCtrl = require('../controllers/lease.controller');
const notifCtrl = require('../controllers/notification.controller');
const dashCtrl = require('../controllers/dashboard.controller');

const router = express.Router();

// OTP-specific rate limiter: 5 requests per phone per 15 min
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.phone || req.ip,
  message: { message: 'Too many OTP requests. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment initiation rate limiter: 10 per user per 15 min
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { message: 'Too many payment requests. Try again later.' },
});

// ─── Auth (public) ────────────────────────────────────────
router.post('/auth/otp/request', otpLimiter, authCtrl.requestOtpRules, authCtrl.requestOtp);
router.post('/auth/otp/verify', otpLimiter, authCtrl.verifyOtpRules, authCtrl.verifyOtp);

// ─── Auth (protected) ────────────────────────────────────
router.get('/auth/profile', authenticate, authCtrl.getProfile);
router.put('/auth/profile', authenticate, authCtrl.updateProfileRules, authCtrl.updateProfile);

// ─── Properties ───────────────────────────────────────────
router.get('/properties', authenticate, propertyCtrl.getProperties);
router.get('/properties/:id', authenticate, propertyCtrl.getProperty);
router.post('/properties', authenticate, authorize('landlord', 'admin'), propertyCtrl.createProperty);
router.put('/properties/:id', authenticate, authorize('landlord', 'admin'), propertyCtrl.updateProperty);

// ─── Units ────────────────────────────────────────────────
router.get('/properties/:propertyId/units', authenticate, propertyCtrl.getUnits);
router.post('/properties/:propertyId/units', authenticate, authorize('landlord', 'admin'), propertyCtrl.createUnit);

// ─── Tenants ──────────────────────────────────────────────
router.get('/tenants', authenticate, tenantCtrl.getTenants);
router.get('/tenants/:id', authenticate, tenantCtrl.getTenant);
router.post('/tenants', authenticate, authorize('landlord', 'admin'), tenantCtrl.addTenant);
router.delete('/tenants/:id', authenticate, authorize('landlord', 'admin'), tenantCtrl.removeTenant);

// ─── Payments ─────────────────────────────────────────────
router.post('/payments/mpesa/initiate', authenticate, paymentLimiter, paymentCtrl.initiatePaymentRules, paymentCtrl.initiatePayment);
router.get('/payments', authenticate, paymentCtrl.getPaymentsRules, paymentCtrl.getPayments);
router.get('/payments/:id/status', authenticate, paymentCtrl.getPaymentStatus);
router.get('/payments/ledger/:tenantId', authenticate, paymentCtrl.getLedger);

// M-Pesa callbacks (unauthenticated — called by Safaricom, IP-restricted)
router.post('/payments/mpesa/callback', mpesaIpWhitelist, paymentCtrl.mpesaCallback);
router.post('/payments/mpesa/timeout', mpesaIpWhitelist, paymentCtrl.mpesaTimeout);

// ─── Leases ───────────────────────────────────────────────
router.get('/leases', authenticate, leaseCtrl.getLeases);
router.post('/leases', authenticate, authorize('landlord', 'admin'), leaseCtrl.createLease);
router.post('/leases/:id/sign', authenticate, leaseCtrl.signLease);

// ─── Notifications ────────────────────────────────────────
router.get('/notifications', authenticate, notifCtrl.getNotifications);
router.put('/notifications/:id/read', authenticate, notifCtrl.markRead);

// ─── Messages ─────────────────────────────────────────────
router.get('/messages/conversations', authenticate, notifCtrl.getConversations);
router.get('/messages/:conversationId', authenticate, notifCtrl.getMessages);
router.post('/messages/:conversationId', authenticate, notifCtrl.sendMessage);

// ─── Dashboard ────────────────────────────────────────────
router.get('/dashboard', authenticate, dashCtrl.getDashboard);

module.exports = router;
