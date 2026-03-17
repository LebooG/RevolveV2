/**
 * Payment Service
 *
 * Orchestrates M-Pesa STK Push, payment recording,
 * ledger entries, and post-payment notifications.
 */

const db = require('../config/database');
const mpesaService = require('./mpesa.service');
const smsService = require('./sms.service');
const logger = require('../config/logger');

class PaymentService {
  /**
   * Initiate an M-Pesa STK Push payment.
   */
  async initiatePayment({ tenantId, amount, phone, description, userId }) {
    // Fetch tenant and property info
    const tenant = await db('tenants')
      .join('properties', 'tenants.property_id', 'properties.id')
      .where('tenants.id', tenantId)
      .select(
        'tenants.*',
        'properties.name as property_name',
        'properties.id as prop_id',
        'properties.landlord_id'
      )
      .first();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Calculate platform fee
    const feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '2');
    const platformFee = Math.round(amount * (feePercent / 100));

    // Create payment record
    const [payment] = await db('payments')
      .insert({
        tenant_id: tenantId,
        property_id: tenant.prop_id,
        amount,
        platform_fee: platformFee,
        phone,
        description: description || `Rent payment for ${tenant.property_name}`,
        method: 'mpesa',
        status: 'pending',
        reference: `RR-${Date.now()}`,
      })
      .returning('*');

    try {
      // Initiate STK Push
      const stkResult = await mpesaService.stkPush({
        phone,
        amount,
        accountRef: `RR-${tenant.property_name.replace(/\s/g, '').slice(0, 10)}`,
        description: `Rent: ${tenant.property_name}`,
      });

      // Update payment with M-Pesa reference IDs
      await db('payments').where({ id: payment.id }).update({
        mpesa_checkout_request_id: stkResult.CheckoutRequestID,
        mpesa_merchant_request_id: stkResult.MerchantRequestID,
        status: 'processing',
        updated_at: new Date(),
      });

      logger.info('Payment initiated', {
        paymentId: payment.id,
        checkoutRequestId: stkResult.CheckoutRequestID,
      });

      return {
        paymentId: payment.id,
        checkoutRequestId: stkResult.CheckoutRequestID,
        status: 'processing',
      };
    } catch (err) {
      // Mark payment as failed
      await db('payments').where({ id: payment.id }).update({
        status: 'failed',
        updated_at: new Date(),
      });
      throw err;
    }
  }

  /**
   * Process M-Pesa callback after STK Push completes.
   */
  async processCallback(callbackData) {
    const parsed = mpesaService.parseCallback(callbackData);

    logger.info('M-Pesa callback received', {
      checkoutRequestId: parsed.checkoutRequestId,
      success: parsed.success,
    });

    // Find the payment by checkout request ID
    const payment = await db('payments')
      .where({ mpesa_checkout_request_id: parsed.checkoutRequestId })
      .first();

    if (!payment) {
      logger.error('Payment not found for callback', {
        checkoutRequestId: parsed.checkoutRequestId,
      });
      return;
    }

    if (parsed.success) {
      // ─── SUCCESSFUL PAYMENT ─────────────────────────────
      await db.transaction(async (trx) => {
        // 1. Update payment record
        await trx('payments').where({ id: payment.id }).update({
          status: 'completed',
          mpesa_receipt_number: parsed.mpesaReceiptNumber,
          mpesa_transaction_date: parsed.transactionDate,
          mpesa_raw_callback: JSON.stringify(callbackData),
          paid_at: new Date(),
          updated_at: new Date(),
        });

        // 2. Get current balance for this tenant
        const lastEntry = await trx('ledger_entries')
          .where({ tenant_id: payment.tenant_id })
          .orderBy('created_at', 'desc')
          .first();

        const previousBalance = lastEntry ? lastEntry.running_balance : 0;
        const newBalance = previousBalance - payment.amount;

        // 3. Create ledger entry (credit — reduces balance)
        await trx('ledger_entries').insert({
          tenant_id: payment.tenant_id,
          payment_id: payment.id,
          type: 'payment',
          description: `M-Pesa payment - ${parsed.mpesaReceiptNumber}`,
          amount: -payment.amount,
          running_balance: newBalance,
          effective_date: new Date(),
        });

        // 4. Create success notification
        const tenant = await trx('tenants').where({ id: payment.tenant_id }).first();
        if (tenant) {
          await trx('notifications').insert({
            user_id: tenant.user_id || payment.tenant_id,
            title: 'Payment Received',
            message: `Your payment of KES ${payment.amount.toLocaleString()} has been confirmed. Receipt: ${parsed.mpesaReceiptNumber}`,
            type: 'success',
          });

          // 5. Send confirmation SMS
          await smsService.sendPaymentConfirmation(
            tenant.phone,
            tenant.name,
            payment.amount,
            parsed.mpesaReceiptNumber
          );
        }
      });

      logger.info('Payment completed successfully', {
        paymentId: payment.id,
        receipt: parsed.mpesaReceiptNumber,
      });
    } else {
      // ─── FAILED PAYMENT ─────────────────────────────────
      await db('payments').where({ id: payment.id }).update({
        status: 'failed',
        mpesa_raw_callback: JSON.stringify(callbackData),
        updated_at: new Date(),
      });

      logger.warn('Payment failed', {
        paymentId: payment.id,
        resultCode: parsed.resultCode,
        resultDesc: parsed.resultDesc,
      });
    }
  }

  /**
   * Get payment status.
   */
  async getStatus(paymentId) {
    const payment = await db('payments').where({ id: paymentId }).first();
    if (!payment) throw new Error('Payment not found');

    // If still processing, query M-Pesa
    if (payment.status === 'processing' && payment.mpesa_checkout_request_id) {
      try {
        const queryResult = await mpesaService.queryStatus(
          payment.mpesa_checkout_request_id
        );
        return { ...payment, mpesaQueryResult: queryResult };
      } catch {
        // Query failed, return current status
      }
    }

    return payment;
  }

  /**
   * Generate monthly rent charges for all active tenants.
   */
  async generateMonthlyCharges() {
    const tenants = await db('tenants').where({ status: 'active' });

    for (const tenant of tenants) {
      const lastEntry = await db('ledger_entries')
        .where({ tenant_id: tenant.id })
        .orderBy('created_at', 'desc')
        .first();

      const previousBalance = lastEntry ? lastEntry.running_balance : 0;
      const newBalance = previousBalance + tenant.rent_amount;

      await db('ledger_entries').insert({
        tenant_id: tenant.id,
        type: 'charge',
        description: `Monthly rent charge — ${new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}`,
        amount: tenant.rent_amount,
        running_balance: newBalance,
        effective_date: new Date(),
      });

      logger.info('Monthly charge generated', {
        tenantId: tenant.id,
        amount: tenant.rent_amount,
      });
    }
  }
}

module.exports = new PaymentService();
