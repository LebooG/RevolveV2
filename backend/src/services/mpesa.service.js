/**
 * M-Pesa Service — Safaricom Daraja API Integration
 *
 * Handles:
 * - OAuth token generation
 * - STK Push (Lipa Na M-Pesa Online)
 * - Payment status query
 * - Callback processing
 */

const axios = require('axios');
const logger = require('../config/logger');

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.baseUrl = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    this.timeoutUrl = process.env.MPESA_TIMEOUT_URL;

    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Generate OAuth access token from Daraja API.
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: { Authorization: `Basic ${auth}` },
          timeout: 15000,
        }
      );

      this.accessToken = response.data.access_token;
      // Token valid for ~3600s, refresh 60s early
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;

      logger.info('M-Pesa access token generated');
      return this.accessToken;
    } catch (err) {
      logger.error('M-Pesa token error:', err.response?.data || err.message);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  /**
   * Generate the timestamp and password for STK Push.
   */
  generatePassword() {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
    return { timestamp, password };
  }

  /**
   * Initiate an STK Push (Lipa Na M-Pesa Online).
   *
   * @param {string} phone  — Payer phone number (254XXXXXXXXX)
   * @param {number} amount — Amount in KES (whole number)
   * @param {string} accountRef — Account reference (e.g. property-unit)
   * @param {string} description — Transaction description
   * @returns {Object} — { MerchantRequestID, CheckoutRequestID, ResponseCode, ... }
   */
  async stkPush({ phone, amount, accountRef, description }) {
    const token = await this.getAccessToken();
    const { timestamp, password } = this.generatePassword();

    // Ensure phone format: 254XXXXXXXXX
    const formattedPhone = phone.replace(/^\+/, '');

    const payload = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: this.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: this.callbackUrl,
      AccountReference: accountRef || 'RevolveRent',
      TransactionDesc: description || 'Rent Payment',
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      logger.info('STK Push initiated', {
        checkoutRequestId: response.data.CheckoutRequestID,
        phone: formattedPhone,
        amount,
      });

      return response.data;
    } catch (err) {
      logger.error('STK Push error:', err.response?.data || err.message);
      throw new Error(
        err.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment'
      );
    }
  }

  /**
   * Query the status of an STK Push transaction.
   */
  async queryStatus(checkoutRequestId) {
    const token = await this.getAccessToken();
    const { timestamp, password } = this.generatePassword();

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      return response.data;
    } catch (err) {
      logger.error('STK Query error:', err.response?.data || err.message);
      throw new Error('Failed to query payment status');
    }
  }

  /**
   * Parse the STK Push callback data.
   * Returns a normalized object.
   */
  parseCallback(body) {
    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return { success: false, error: 'Invalid callback format' };
    }

    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;
    const merchantRequestId = stkCallback.MerchantRequestID;
    const checkoutRequestId = stkCallback.CheckoutRequestID;

    if (resultCode !== 0) {
      return {
        success: false,
        resultCode,
        resultDesc,
        merchantRequestId,
        checkoutRequestId,
      };
    }

    // Extract callback metadata items
    const items = stkCallback.CallbackMetadata?.Item || [];
    const meta = {};
    items.forEach((item) => {
      meta[item.Name] = item.Value;
    });

    return {
      success: true,
      resultCode,
      resultDesc,
      merchantRequestId,
      checkoutRequestId,
      amount: meta.Amount,
      mpesaReceiptNumber: meta.MpesaReceiptNumber,
      transactionDate: meta.TransactionDate?.toString(),
      phoneNumber: meta.PhoneNumber?.toString(),
    };
  }
}

module.exports = new MpesaService();
