const db = require('../config/database');
const logger = require('../config/logger');

exports.getProperties = async (req, res) => {
  try {
    const properties = await db('properties')
      .where({ landlord_id: req.user.id, is_active: true })
      .orderBy('created_at', 'desc');

    // Attach unit counts
    for (const prop of properties) {
      const counts = await db('units')
        .where({ property_id: prop.id })
        .select(
          db.raw('COUNT(*) as total'),
          db.raw("COUNT(*) FILTER (WHERE status = 'occupied') as occupied"),
          db.raw("COUNT(*) FILTER (WHERE status = 'vacant') as vacant")
        )
        .first();
      prop.units = counts;
    }

    res.json({ properties });
  } catch (err) {
    logger.error('Get properties error:', err);
    res.status(500).json({ message: 'Failed to fetch properties' });
  }
};

exports.getProperty = async (req, res) => {
  try {
    const property = await db('properties')
      .where({ id: req.params.id, landlord_id: req.user.id })
      .first();

    if (!property) return res.status(404).json({ message: 'Property not found' });

    const units = await db('units').where({ property_id: property.id });
    const tenants = await db('tenants').where({ property_id: property.id, status: 'active' });

    res.json({ property, units, tenants });
  } catch (err) {
    logger.error('Get property error:', err);
    res.status(500).json({ message: 'Failed to fetch property' });
  }
};

exports.createProperty = async (req, res) => {
  try {
    const { name, location, address, units } = req.body;

    const [property] = await db('properties')
      .insert({
        landlord_id: req.user.id,
        name,
        location,
        address,
        total_units: units || 0,
      })
      .returning('*');

    res.status(201).json({ property });
  } catch (err) {
    logger.error('Create property error:', err);
    res.status(500).json({ message: 'Failed to create property' });
  }
};

exports.updateProperty = async (req, res) => {
  try {
    const { name, location, address } = req.body;
    const updates = { updated_at: new Date() };
    if (name) updates.name = name;
    if (location) updates.location = location;
    if (address) updates.address = address;

    const [property] = await db('properties')
      .where({ id: req.params.id, landlord_id: req.user.id })
      .update(updates)
      .returning('*');

    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json({ property });
  } catch (err) {
    logger.error('Update property error:', err);
    res.status(500).json({ message: 'Failed to update property' });
  }
};

// ─── Units ────────────────────────────────────────────────
exports.getUnits = async (req, res) => {
  try {
    const units = await db('units').where({ property_id: req.params.propertyId });
    res.json({ units });
  } catch (err) {
    logger.error('Get units error:', err);
    res.status(500).json({ message: 'Failed to fetch units' });
  }
};

exports.createUnit = async (req, res) => {
  try {
    const { unitNumber, rentAmount, type } = req.body;

    const [unit] = await db('units')
      .insert({
        property_id: req.params.propertyId,
        unit_number: unitNumber,
        rent_amount: rentAmount,
        type: type || null,
      })
      .returning('*');

    res.status(201).json({ unit });
  } catch (err) {
    logger.error('Create unit error:', err);
    res.status(500).json({ message: 'Failed to create unit' });
  }
};
