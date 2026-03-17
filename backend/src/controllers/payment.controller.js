const { body, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const paymentService = require('../services/payment.service');
const db = require('../config/database');
const logger = require('../config/logger');

// Validation rules
exports.initiatePaymentRules = [
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('phone').matches(/^254\d{9}$/).withMessage('Phone must be in 254XXXXXXXXX format'),
  body('tenantId').optional().isString().trim(),
  body('description').optional().isString().trim().escape(),
  validate,
];

exports.getPaymentsRules = [
  query('tenantId').optional().isUUID(),
  query('propertyId').optional().isUUID(),
  query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  validate,
];

/**
 * POST /payments/mpesa/initiate
 *
 * Resolves tenant in two ways:
 * 1. tenantId is a valid UUID -> use that (landlord paying on behalf)
 * 2. tenantId missing or 'current' -> resolve from authenticated user
 */
exports.initiatePayment = async (req, res) => {
  try {
    let { tenantId, amount, phone, description } = req.body;

    // Resolve tenant from JWT user if not a valid UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!tenantId || !uuidPattern.test(tenantId)) {
      const tenant = await db('tenants')
        .where({ user_id: req.user.id, status: 'active' })
        .first();

      if (!tenant) {
        return res.status(404).json({ message: 'No active tenant record found for your account' });
      }
      tenantId = tenant.id;
    }

    // Verify tenant exists and caller has access
    const tenant = await db('tenants')
      .join('properties', 'tenants.property_id', 'properties.id')
      .where('tenants.id', tenantId)
      .select('tenants.*', 'properties.landlord_id')
      .first();

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Access check: must be the tenant or their landlord
    const isOwner = tenant.user_id === req.user.id;
    const isLandlord = tenant.landlord_id === req.user.id;
    if (!isOwner && !isLandlord && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to make payment for this tenant' });
    }

    const result = await paymentService.initiatePayment({
      tenantId,
      amount: parseInt(amount),
      phone,
      description,
      userId: req.user.id,
    });

    res.json(result);
  } catch (err) {
    logger.error('Initiate payment error:', err);
    res.status(500).json({ message: err.message || 'Payment initiation failed' });
  }
};

/**
 * POST /payments/mpesa/callback
 *
 * Called by Safaricom after STK Push completes.
 * Responds 200 immediately, then processes in background.
 */
exports.mpesaCallback = async (req, res) => {
  // Respond 200 to Safaricom FIRST — before any processing
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

  // Process asynchronously — errors must not crash server
  try {
    const callbackBody = req.body;
    if (!callbackBody?.Body?.stkCallback) {
      logger.warn('M-Pesa callback: invalid payload structure');
      return;
    }

    logger.info('M-Pesa callback processing', {
      checkoutRequestId: callbackBody.Body.stkCallback.CheckoutRequestID,
      resultCode: callbackBody.Body.stkCallback.ResultCode,
    });

    await paymentService.processCallback(callbackBody);
  } catch (err) {
    logger.error('M-Pesa callback processing error:', err);
  }
};

/**
 * POST /payments/mpesa/timeout
 */
exports.mpesaTimeout = async (req, res) => {
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const checkoutRequestId = req.body?.Body?.stkCallback?.CheckoutRequestID;
    if (checkoutRequestId) {
      await db('payments')
        .where({ mpesa_checkout_request_id: checkoutRequestId, status: 'processing' })
        .update({ status: 'failed', updated_at: new Date() });
      logger.warn('M-Pesa timeout for checkout:', checkoutRequestId);
    }
  } catch (err) {
    logger.error('M-Pesa timeout handler error:', err);
  }
};

/**
 * GET /payments/:id/status
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const paymentId = req.params.id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)) {
      return res.status(400).json({ message: 'Invalid payment ID format' });
    }
    const payment = await paymentService.getStatus(paymentId);
    res.json({ payment });
  } catch (err) {
    logger.error('Payment status error:', err);
    res.status(err.message === 'Payment not found' ? 404 : 500).json({
      message: err.message || 'Failed to get payment status',
    });
  }
};

/**
 * GET /payments — scoped to user role
 */
exports.getPayments = async (req, res) => {
  try {
    const { tenantId, propertyId, status, from, to } = req.query;
    let baseQuery;

    if (req.user.role === 'tenant') {
      const tenant = await db('tenants').where({ user_id: req.user.id }).first();
      if (!tenant) return res.json({ payments: [] });
      baseQuery = db('payments').where('payments.tenant_id', tenant.id);
    } else {
      baseQuery = db('payments')
        .join('properties', 'payments.property_id', 'properties.id')
        .where('properties.landlord_id', req.user.id);
    }

    baseQuery = baseQuery
      .join('tenants', 'payments.tenant_id', 'tenants.id');

    if (req.user.role !== 'tenant') {
      baseQuery = baseQuery.join('properties as p2', 'payments.property_id', 'p2.id');
    }

    if (tenantId) baseQuery = baseQuery.andWhere('payments.tenant_id', tenantId);
    if (propertyId) baseQuery = baseQuery.andWhere('payments.property_id', propertyId);
    if (status) baseQuery = baseQuery.andWhere('payments.status', status);
    if (from) baseQuery = baseQuery.andWhere('payments.created_at', '>=', from);
    if (to) baseQuery = baseQuery.andWhere('payments.created_at', '<=', to);

    const payments = await baseQuery
      .select('payments.*', 'tenants.name as tenant_name', 'tenants.phone as tenant_phone')
      .orderBy('payments.created_at', 'desc')
      .limit(100);

    res.json({ payments });
  } catch (err) {
    logger.error('Get payments error:', err);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
};

/**
 * GET /payments/ledger/:tenantId
 */
exports.getLedger = async (req, res) => {
  try {
    const tenantId = req.params.tenantId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
      return res.status(400).json({ message: 'Invalid tenant ID format' });
    }

    const entries = await db('ledger_entries')
      .where({ tenant_id: tenantId })
      .orderBy('effective_date', 'desc')
      .limit(50);

    const balance = entries.length > 0 ? entries[0].running_balance : 0;
    res.json({ entries, balance });
  } catch (err) {
    logger.error('Get ledger error:', err);
    res.status(500).json({ message: 'Failed to fetch ledger' });
  }
};
