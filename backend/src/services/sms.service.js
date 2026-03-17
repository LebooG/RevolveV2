/**
 * HostPinnacle SMS Service
 *
 * Integrates with HostPinnacle SMS Gateway (https://smsportal.hostpinnacle.co.ke)
 * API Docs: Send SMS via POST /SMSApi/send with form-data
 *
 * Authentication: userid + password (account credentials)
 * Send methods: quick (single), group (contact group), bulkupload (CSV file)
 * Response format: JSON
 *
 * Used for: OTP delivery, rent reminders, payment confirmations.
 */

const axios = require('axios');
const FormData = require('form-data');
const db = require('../config/database');
const logger = require('../config/logger');

class SmsService {
  constructor() {
    // HostPinnacle uses account userid + password for auth (NOT an API key)
    this.userId = process.env.HOSTPINNACLE_USER_ID;
    this.password = process.env.HOSTPINNACLE_PASSWORD;
    this.senderId = process.env.HOSTPINNACLE_SENDER_ID || 'REVOLVERENT';
    this.baseUrl = process.env.HOSTPINNACLE_BASE_URL || 'https://smsportal.hostpinnacle.co.ke';
  }

  /**
   * Send a single SMS via HostPinnacle using the "quick" send method.
   *
   * API Endpoint: POST /SMSApi/send
   * Content-Type: multipart/form-data
   *
   * Required form-data params:
   *   userid, password, mobile, senderid, msg,
   *   sendMethod=quick, msgType=text, output=json
   *
   * Optional:
   *   duplicatecheck=true (prevents duplicate sends)
   *
   * @param {string} phone   — Recipient in international format (254XXXXXXXXX)
   * @param {string} message — SMS body text
   * @param {string} type    — Log category: otp | rent_reminder | payment_confirmation | general
   * @returns {Object}       — { success, messageId, response }
   */
  async send(phone, message, type = 'general') {
    // Normalize phone: strip leading +, ensure 254 prefix
    let formattedPhone = phone.replace(/^\+/, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    }

    // Log the SMS attempt in database
    const [logEntry] = await db('sms_log')
      .insert({
        phone: formattedPhone,
        message,
        type,
        status: 'queued',
      })
      .returning('*');

    try {
      // Build form-data payload per HostPinnacle API spec
      const formData = new FormData();
      formData.append('userid', this.userId);
      formData.append('password', this.password);
      formData.append('mobile', formattedPhone);
      formData.append('senderid', this.senderId);
      formData.append('msg', message);
      formData.append('sendMethod', 'quick');
      formData.append('msgType', 'text');
      formData.append('output', 'json');
      formData.append('duplicatecheck', 'true');

      const response = await axios.post(
        `${this.baseUrl}/SMSApi/send`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000,
        }
      );

      const result = response.data;

      // HostPinnacle returns various response shapes —
      // check for success indicators
      const isSuccess = result?.status === 'success' ||
                        result?.responseCode === '0' ||
                        result?.statusCode === 200 ||
                        (typeof result === 'string' && result.includes('success'));

      // Update SMS log
      await db('sms_log').where({ id: logEntry.id }).update({
        status: isSuccess ? 'sent' : 'failed',
        provider_message_id: result?.transactionId || result?.messageId || null,
        provider_response: JSON.stringify(result),
        updated_at: new Date(),
      });

      logger.info('SMS sent via HostPinnacle', {
        phone: formattedPhone,
        type,
        transactionId: result?.transactionId,
        success: isSuccess,
      });

      return {
        success: isSuccess,
        transactionId: result?.transactionId || result?.messageId,
        response: result,
      };
    } catch (err) {
      // Update log as failed
      await db('sms_log').where({ id: logEntry.id }).update({
        status: 'failed',
        provider_response: JSON.stringify(err.response?.data || err.message),
        updated_at: new Date(),
      });

      logger.error('HostPinnacle SMS failed:', {
        phone: formattedPhone,
        error: err.response?.data || err.message,
      });

      return { success: false, error: err.message };
    }
  }

  /**
   * Send SMS to a HostPinnacle contact group using the "group" send method.
   *
   * @param {string} groupId — HostPinnacle group ID
   * @param {string} message — SMS body text
   * @returns {Object}
   */
  async sendToGroup(groupId, message) {
    try {
      const formData = new FormData();
      formData.append('userid', this.userId);
      formData.append('password', this.password);
      formData.append('senderid', this.senderId);
      formData.append('msg', message);
      formData.append('sendMethod', 'group');
      formData.append('group', groupId);
      formData.append('msgType', 'text');
      formData.append('output', 'json');
      formData.append('duplicatecheck', 'true');

      const response = await axios.post(
        `${this.baseUrl}/SMSApi/send`,
        formData,
        {
          headers: { ...formData.getHeaders() },
          timeout: 30000,
        }
      );

      logger.info('Group SMS sent via HostPinnacle', { groupId });
      return { success: true, response: response.data };
    } catch (err) {
      logger.error('HostPinnacle group SMS failed:', { groupId, error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Check delivery report for a transaction via HostPinnacle DLR API.
   *
   * @param {string} transactionId — The transaction ID returned from send
   * @returns {Object}
   */
  async getDeliveryReport(transactionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/SMSApi/report/dlr`, {
          params: {
            userid: this.userId,
            password: this.password,
            transactionId,
            output: 'json',
          },
          timeout: 15000,
        }
      );
      return { success: true, report: response.data };
    } catch (err) {
      logger.error('DLR fetch failed:', { transactionId, error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Check SMS length and cost before sending.
   *
   * @param {string} message — The message text to check
   * @returns {Object}
   */
  async checkSmsCost(message) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/SMSApi/info/sms-length`, {
          params: {
            userid: this.userId,
            password: this.password,
            msg: message,
            output: 'json',
          },
          timeout: 10000,
        }
      );
      return { success: true, info: response.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── Convenience Methods for Revolve Rent ──────────────

  /**
   * Send OTP verification code.
   */
  async sendOtp(phone, code) {
    const message = `Your Revolve Rent verification code is: ${code}. Valid for 5 minutes. Do not share this code.`;
    return this.send(phone, message, 'otp');
  }

  /**
   * Send rent payment reminder.
   */
  async sendRentReminder(phone, tenantName, amount, dueDate, property) {
    const message = `Hi ${tenantName}, your rent of KES ${amount.toLocaleString()} for ${property} is due on ${dueDate}. Pay via Revolve Rent app or M-Pesa Paybill.`;
    return this.send(phone, message, 'rent_reminder');
  }

  /**
   * Send payment confirmation.
   */
  async sendPaymentConfirmation(phone, tenantName, amount, receiptNumber) {
    const message = `Hi ${tenantName}, your payment of KES ${amount.toLocaleString()} has been received. Receipt: ${receiptNumber}. Thank you!`;
    return this.send(phone, message, 'payment_confirmation');
  }

  /**
   * Send late payment notice.
   */
  async sendLateNotice(phone, tenantName, amount, daysLate, property) {
    const message = `Hi ${tenantName}, your rent of KES ${amount.toLocaleString()} for ${property} is ${daysLate} days overdue. Please settle to avoid penalties.`;
    return this.send(phone, message, 'rent_reminder');
  }

  /**
   * Send lease expiry warning.
   */
  async sendLeaseExpiryWarning(phone, tenantName, expiryDate, property) {
    const message = `Hi ${tenantName}, your lease for ${property} expires on ${expiryDate}. Contact your landlord to discuss renewal.`;
    return this.send(phone, message, 'general');
  }

  /**
   * Send bulk SMS (e.g., batch rent reminders).
   * Uses sequential sends with delay to respect rate limits.
   */
  async sendBulk(recipients) {
    const results = [];
    for (const r of recipients) {
      // 200ms delay between sends to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
      const result = await this.send(r.phone, r.message, r.type || 'general');
      results.push({ phone: r.phone, ...result });
    }
    logger.info(`Bulk SMS completed: ${results.length} messages`, {
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });
    return results;
  }
}

module.exports = new SmsService();
