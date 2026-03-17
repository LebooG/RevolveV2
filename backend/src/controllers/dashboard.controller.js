const db = require('../config/database');
const logger = require('../config/logger');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Property count
    const propertyCount = await db('properties')
      .where({ landlord_id: userId, is_active: true })
      .count('id as count')
      .first();

    // Total units & occupancy
    const unitStats = await db('units')
      .join('properties', 'units.property_id', 'properties.id')
      .where('properties.landlord_id', userId)
      .select(
        db.raw('COUNT(*) as total_units'),
        db.raw("COUNT(*) FILTER (WHERE units.status = 'occupied') as occupied"),
        db.raw("COUNT(*) FILTER (WHERE units.status = 'vacant') as vacant")
      )
      .first();

    // Active tenants
    const tenantCount = await db('tenants')
      .join('properties', 'tenants.property_id', 'properties.id')
      .where('properties.landlord_id', userId)
      .where('tenants.status', 'active')
      .count('tenants.id as count')
      .first();

    // This month's collected rent
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyCollection = await db('payments')
      .join('properties', 'payments.property_id', 'properties.id')
      .where('properties.landlord_id', userId)
      .where('payments.status', 'completed')
      .where('payments.paid_at', '>=', startOfMonth)
      .sum('payments.amount as total')
      .first();

    // Pending payments this month
    const pendingPayments = await db('payments')
      .join('properties', 'payments.property_id', 'properties.id')
      .where('properties.landlord_id', userId)
      .whereIn('payments.status', ['pending', 'processing'])
      .sum('payments.amount as total')
      .count('payments.id as count')
      .first();

    // Unread notifications
    const unreadNotifs = await db('notifications')
      .where({ user_id: userId, is_read: false })
      .count('id as count')
      .first();

    res.json({
      properties: parseInt(propertyCount?.count || 0),
      totalUnits: parseInt(unitStats?.total_units || 0),
      occupiedUnits: parseInt(unitStats?.occupied || 0),
      vacantUnits: parseInt(unitStats?.vacant || 0),
      activeTenants: parseInt(tenantCount?.count || 0),
      monthlyCollection: parseInt(monthlyCollection?.total || 0),
      pendingPayments: {
        total: parseInt(pendingPayments?.total || 0),
        count: parseInt(pendingPayments?.count || 0),
      },
      unreadNotifications: parseInt(unreadNotifs?.count || 0),
    });
  } catch (err) {
    logger.error('Dashboard error:', err);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
};
