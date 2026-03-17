/**
 * Revolve Rent — Database Schema Migration
 * Creates all core tables for the multi-tenant property management platform.
 */

const db = require('../config/database');

async function migrate() {
  console.log('Running migrations...');

  // ─── Users ──────────────────────────────────────────────
  await db.schema.createTableIfNotExists('users', (t) => {
    t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
    t.string('name', 255);
    t.string('phone', 20).notNullable().unique();
    t.string('email', 255);
    t.enu('role', ['landlord', 'tenant', 'admin']).defaultTo('landlord');
    t.string('avatar_url', 512);
    t.string('otp_code', 255);
    t.timestamp('otp_expires_at');
    t.integer('otp_attempts').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ─── Properties ─────────────────────────────────────────
  await db.schema.createTableIfNotExists('properties', (t) => {
    t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
    t.uuid('landlord_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.string('location', 255);
    t.string('address', 512);
    t.string('image_url', 512);
    t.integer('total_units').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ─── Units ──────────────────────────────────────────────
  await db.schema.createTableIfNotExists('units', (t) => {
    t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
    t.uuid('property_id').notNullable().references('id').inTable('properties').onDelete('CASCADE');
    t.string('unit_number', 50).notNullable();
    t.string('type', 50); // studio, 1br, 2br, etc.
    t.integer('rent_amount').notNullable();
    t.enu('status', ['vacant', 'occupied']).defaultTo('vacant');
    t.timestamps(true, true);
    t.unique(['property_id', 'unit_number']);
  });

  // ─── Tenants ────────────────────────────────────────────
  await db.schema.createTableIfNotExists('tenants', (t) => {
    t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('unit_id').notNullable().references('id').inTable('units').onDelete('CASCADE');
    t.uuid('property_id').notNullable().references('id').inTable('properties').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.string('phone', 20).notNullable();
    t.string('email', 255);
    t.integer('rent_amount').notNullable();
    t.date('lease_start').notNullable();
    t.date('lease_end');
    t.enu('status', ['active', 'inactive', 'evicted']).defaultTo('active');
    t.timestamps(true, true);
  });

  // ─── Leases ─────────────────────────────────────────────
  await db.schema.createTableIfNotExists('leases', (t) => {
    t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('unit_id').notNullable().references('id').inTable('units').onDelete('CASCADE');
    t.date('start_date').notNullable();
    t.date('end_date');
    t.integer('rent_amount').notNullable();
    t.text('terms');
    t.string('document_url', 512);
    t.enu('status', ['draft', 'pending_signature', 'active', 'expired', 'terminated']).defaultTo('draft');
    t.string('tenant_signature', 512);
    t.timestamp('signed_at');
    t.timestamps(true, true);
  });

  // ─── Payments ───────────────────────────────────────────
  await db.schema.createTableIfNotExists('payments', (t) => {
    t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('property_id').notNullable().references('id').inTable('properties').onDelete('CASCADE');
    t.integer('amount').notNullable();
    t.integer('platform_fee').defaultTo(0);
    t.string('phone', 20);
    t.string('description', 512);
    t.enu('method', ['mpesa', 'bank', 'cash', 'other']).defaultTo('mpesa');
    t.enu('status', ['pending', 'processing', 'completed', 'failed', 'cancelled']).defaultTo('pending');
    t.string('mpesa_checkout_request_id', 100);
    t.string('mpesa_merchant_request_id', 100);
    t.string('mpesa_receipt_number', 50);
    t.string('mpesa_transaction_date', 30);
    t.text('mpesa_raw_callback'); // Store full callback JSON for audit
    t.string('reference', 100);
    t.timestamp('paid_at');
    t.timestamps(true, true);

    t.index(['tenant_id', 'status']);
    t.index(['property_id', 'created_at']);
    t.index('mpesa_checkout_request_id');
  });

  // ─── Ledger Entries ─────────────────────────────────────
  await db.schema.createTableIfNotExists('ledger_entries', (t) => {
    t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
    t.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('payment_id').references('id').inTable('payments').onDelete('SET NULL');
    t.enu('type', ['charge', 'payment', 'credit', 'adjustment']).notNullable();
    t.string('description', 512);
    t.integer('amount').notNullable(); // positive = debit, negative = credit
    t.integer('running_balance').notNullable();
    t.date('effective_date').notNullable();
    t.timestamps(true, true);

    t.index(['tenant_id', 'effective_date']);
  });

  // ─── Notifications ──────────────────────────────────────
  await db.schema.createTableIfNotExists('notifications', (t) => {
    t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.text('message').notNullable();
    t.enu('type', ['info', 'urgent', 'success', 'warning']).defaultTo('info');
    t.boolean('is_read').defaultTo(false);
    t.timestamps(true, true);

    t.index(['user_id', 'is_read']);
  });

  // ─── Messages ───────────────────────────────────────────
  await db.schema.createTableIfNotExists('messages', (t) => {
    t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
    t.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('receiver_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('property_id').references('id').inTable('properties').onDelete('SET NULL');
    t.text('content').notNullable();
    t.boolean('is_read').defaultTo(false);
    t.timestamps(true, true);

    t.index(['sender_id', 'receiver_id', 'created_at']);
  });

  // ─── SMS Log ────────────────────────────────────────────
  await db.schema.createTableIfNotExists('sms_log', (t) => {
    t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
    t.string('phone', 20).notNullable();
    t.text('message').notNullable();
    t.enu('type', ['otp', 'rent_reminder', 'payment_confirmation', 'general']).notNullable();
    t.enu('status', ['queued', 'sent', 'delivered', 'failed']).defaultTo('queued');
    t.string('provider_message_id', 100);
    t.text('provider_response');
    t.timestamps(true, true);
  });

  console.log('All migrations completed successfully.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
