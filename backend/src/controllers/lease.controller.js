const db = require('../config/database');
const logger = require('../config/logger');

exports.getLeases = async (req, res) => {
  try {
    let query = db('leases')
      .join('tenants', 'leases.tenant_id', 'tenants.id')
      .join('units', 'leases.unit_id', 'units.id')
      .join('properties', 'tenants.property_id', 'properties.id')
      .where('properties.landlord_id', req.user.id);

    if (req.query.tenantId) {
      query = query.andWhere('leases.tenant_id', req.query.tenantId);
    }

    const leases = await query
      .select(
        'leases.*',
        'tenants.name as tenant_name',
        'units.unit_number',
        'properties.name as property_name'
      )
      .orderBy('leases.created_at', 'desc');

    res.json({ leases });
  } catch (err) {
    logger.error('Get leases error:', err);
    res.status(500).json({ message: 'Failed to fetch leases' });
  }
};

exports.createLease = async (req, res) => {
  try {
    const { tenantId, unitId, startDate, endDate, rentAmount, terms } = req.body;

    const [lease] = await db('leases')
      .insert({
        tenant_id: tenantId,
        unit_id: unitId,
        start_date: startDate,
        end_date: endDate || null,
        rent_amount: rentAmount,
        terms: terms || null,
        status: 'pending_signature',
      })
      .returning('*');

    res.status(201).json({ lease });
  } catch (err) {
    logger.error('Create lease error:', err);
    res.status(500).json({ message: 'Failed to create lease' });
  }
};

exports.signLease = async (req, res) => {
  try {
    const { signature } = req.body;

    const [lease] = await db('leases')
      .where({ id: req.params.id, status: 'pending_signature' })
      .update({
        tenant_signature: signature,
        signed_at: new Date(),
        status: 'active',
        updated_at: new Date(),
      })
      .returning('*');

    if (!lease) return res.status(404).json({ message: 'Lease not found or already signed' });
    res.json({ lease });
  } catch (err) {
    logger.error('Sign lease error:', err);
    res.status(500).json({ message: 'Failed to sign lease' });
  }
};
