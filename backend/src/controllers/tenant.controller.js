const db = require('../config/database');
const logger = require('../config/logger');

exports.getTenants = async (req, res) => {
  try {
    const query = db('tenants')
      .join('units', 'tenants.unit_id', 'units.id')
      .join('properties', 'tenants.property_id', 'properties.id')
      .where('properties.landlord_id', req.user.id)
      .select(
        'tenants.*',
        'units.unit_number',
        'properties.name as property_name'
      );

    if (req.query.propertyId) {
      query.andWhere('tenants.property_id', req.query.propertyId);
    }

    const tenants = await query.orderBy('tenants.created_at', 'desc');
    res.json({ tenants });
  } catch (err) {
    logger.error('Get tenants error:', err);
    res.status(500).json({ message: 'Failed to fetch tenants' });
  }
};

exports.getTenant = async (req, res) => {
  try {
    const tenant = await db('tenants')
      .join('units', 'tenants.unit_id', 'units.id')
      .join('properties', 'tenants.property_id', 'properties.id')
      .where('tenants.id', req.params.id)
      .where('properties.landlord_id', req.user.id)
      .select('tenants.*', 'units.unit_number', 'properties.name as property_name')
      .first();

    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    // Get payment history
    const payments = await db('payments')
      .where({ tenant_id: tenant.id })
      .orderBy('created_at', 'desc')
      .limit(20);

    // Get ledger balance
    const lastEntry = await db('ledger_entries')
      .where({ tenant_id: tenant.id })
      .orderBy('created_at', 'desc')
      .first();

    res.json({
      tenant,
      payments,
      balance: lastEntry?.running_balance || 0,
    });
  } catch (err) {
    logger.error('Get tenant error:', err);
    res.status(500).json({ message: 'Failed to fetch tenant' });
  }
};

exports.addTenant = async (req, res) => {
  try {
    const { name, phone, email, unitId, leaseStart, leaseEnd, rentAmount } = req.body;

    // Verify unit exists and belongs to the landlord
    const unit = await db('units')
      .join('properties', 'units.property_id', 'properties.id')
      .where('units.id', unitId)
      .where('properties.landlord_id', req.user.id)
      .select('units.*', 'properties.id as prop_id')
      .first();

    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    if (unit.status === 'occupied') return res.status(400).json({ message: 'Unit is already occupied' });

    // Check if tenant already has a user account
    let tenantUser = await db('users').where({ phone }).first();
    if (!tenantUser) {
      [tenantUser] = await db('users')
        .insert({ phone, name, email, role: 'tenant' })
        .returning('*');
    }

    const [tenant] = await db('tenants')
      .insert({
        user_id: tenantUser.id,
        unit_id: unitId,
        property_id: unit.prop_id,
        name,
        phone,
        email,
        rent_amount: rentAmount,
        lease_start: leaseStart,
        lease_end: leaseEnd || null,
      })
      .returning('*');

    // Mark unit as occupied
    await db('units').where({ id: unitId }).update({ status: 'occupied', updated_at: new Date() });

    res.status(201).json({ tenant });
  } catch (err) {
    logger.error('Add tenant error:', err);
    res.status(500).json({ message: 'Failed to add tenant' });
  }
};

exports.removeTenant = async (req, res) => {
  try {
    const tenant = await db('tenants')
      .join('properties', 'tenants.property_id', 'properties.id')
      .where('tenants.id', req.params.id)
      .where('properties.landlord_id', req.user.id)
      .select('tenants.*')
      .first();

    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    await db('tenants').where({ id: tenant.id }).update({ status: 'inactive', updated_at: new Date() });
    await db('units').where({ id: tenant.unit_id }).update({ status: 'vacant', updated_at: new Date() });

    res.json({ message: 'Tenant removed' });
  } catch (err) {
    logger.error('Remove tenant error:', err);
    res.status(500).json({ message: 'Failed to remove tenant' });
  }
};
