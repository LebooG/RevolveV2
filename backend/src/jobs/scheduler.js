/**
 * Scheduled Jobs
 *
 * - Daily rent reminder SMS (3 days before due)
 * - Monthly rent charge generation (1st of each month)
 */

const { CronJob } = require('cron');
const db = require('../config/database');
const smsService = require('../services/sms.service');
const paymentService = require('../services/payment.service');
const logger = require('../config/logger');

/**
 * Send rent reminders 3 days before due date.
 * Runs daily at 9:00 AM EAT (06:00 UTC).
 */
const rentReminderJob = new CronJob('0 6 * * *', async () => {
  logger.info('Running rent reminder job...');

  try {
    const tenants = await db('tenants')
      .join('properties', 'tenants.property_id', 'properties.id')
      .where('tenants.status', 'active')
      .select('tenants.*', 'properties.name as property_name');

    // Assume rent is due on the 15th of each month
    const today = new Date();
    const dueDay = 15;
    const daysUntilDue = dueDay - today.getDate();

    if (daysUntilDue >= 1 && daysUntilDue <= 3) {
      const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
      const formattedDue = dueDate.toLocaleDateString('en-KE', {
        month: 'short', day: 'numeric', year: 'numeric',
      });

      for (const tenant of tenants) {
        await smsService.sendRentReminder(
          tenant.phone,
          tenant.name,
          tenant.rent_amount,
          formattedDue,
          tenant.property_name
        );

        // Create notification
        if (tenant.user_id) {
          await db('notifications').insert({
            user_id: tenant.user_id,
            title: 'Rent Due Soon',
            message: `Your rent of KES ${tenant.rent_amount.toLocaleString()} for ${tenant.property_name} is due on ${formattedDue}.`,
            type: 'urgent',
          });
        }
      }

      logger.info(`Rent reminders sent to ${tenants.length} tenants`);
    }
  } catch (err) {
    logger.error('Rent reminder job failed:', err);
  }
});

/**
 * Generate monthly rent charges on the 1st of each month.
 * Runs at midnight EAT on the 1st.
 */
const monthlyChargeJob = new CronJob('0 21 1 * *', async () => {
  // 21:00 UTC = 00:00 EAT
  logger.info('Running monthly charge generation...');

  try {
    await paymentService.generateMonthlyCharges();
    logger.info('Monthly charges generated');
  } catch (err) {
    logger.error('Monthly charge job failed:', err);
  }
});

function startJobs() {
  rentReminderJob.start();
  monthlyChargeJob.start();
  logger.info('Cron jobs started: rent reminders & monthly charges');
}

module.exports = { startJobs };
