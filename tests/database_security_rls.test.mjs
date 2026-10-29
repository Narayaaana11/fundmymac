// =========================================================================
// Automated Test Suite: Database Security & RLS Policy Enforcement
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Database Security & Row-Level Security (RLS) Policies', () => {
  const findMigration = (pattern) => {
    const files = existsSync('supabase/migrations') ? readdirSync('supabase/migrations') : [];
    const match = files.find(f => f.includes(pattern));
    return match ? resolve('supabase/migrations', match) : resolve('supabase/migrations', pattern);
  };

  const secureSchemaMigrationPath = findMigration('secure_fundmymac_schema.sql');
  const razorpayMigrationPath = findMigration('razorpay_integration.sql');
  const setupSqlPath = resolve('supabase-setup.sql');

  test('Migration and setup SQL files exist', () => {
    assert.ok(existsSync(secureSchemaMigrationPath), 'Baseline migration file exists');
    assert.ok(existsSync(razorpayMigrationPath), 'Razorpay versioned migration file exists');
    assert.ok(existsSync(setupSqlPath), 'Root supabase-setup.sql exists');
  });

  const sqlContent = readFileSync(secureSchemaMigrationPath, 'utf8');
  const rzpSqlContent = readFileSync(razorpayMigrationPath, 'utf8');
  const setupContent = readFileSync(setupSqlPath, 'utf8');

  test('All critical tables have ROW LEVEL SECURITY enabled', () => {
    assert.match(sqlContent, /ALTER TABLE public\.site_stats ENABLE ROW LEVEL SECURITY;/, 'site_stats RLS enabled');
    assert.match(sqlContent, /ALTER TABLE public\.brand_spots ENABLE ROW LEVEL SECURITY;/, 'brand_spots RLS enabled');
    assert.match(sqlContent, /ALTER TABLE public\.sponsorship_orders ENABLE ROW LEVEL SECURITY;/, 'sponsorship_orders RLS enabled');
    assert.match(sqlContent, /ALTER TABLE public\.payment_transactions ENABLE ROW LEVEL SECURITY;/, 'payment_transactions RLS enabled');
  });

  test('Razorpay migration configures INR fields and provider indices', () => {
    assert.match(rzpSqlContent, /total_raised_inr_paise BIGINT NOT NULL DEFAULT 0;/, 'INR total column added to site_stats');
    assert.match(rzpSqlContent, /price_inr_paise INT NOT NULL DEFAULT 850000;/, 'INR price column added to brand_spots');
    assert.match(rzpSqlContent, /idx_sponsorship_orders_provider_order_id/, 'Unique index created on provider_order_id');
    assert.match(rzpSqlContent, /CHECK \(currency IN \('inr', 'usd', 'eur'\)\)/, 'Currency constraint permits INR, USD, and EUR');
  });

  test('Unsafe legacy anonymous write policies are explicitly dropped', () => {
    assert.match(sqlContent, /DROP POLICY IF EXISTS "Allow public update on brand_spots"/, 'Drops public update on brand_spots');
    assert.match(sqlContent, /DROP POLICY IF EXISTS "Allow public insert on donations"/, 'Drops public insert on donations');
    assert.match(sqlContent, /DROP POLICY IF EXISTS "Allow public read on donations"/, 'Drops public read on donations');
  });

  test('Strict least-privilege policies deny anonymous mutations', () => {
    assert.match(sqlContent, /CREATE POLICY "Public read site_stats"\s+ON public\.site_stats FOR SELECT TO anon, authenticated/, 'site_stats SELECT only');
    assert.match(sqlContent, /CREATE POLICY "Public read brand_spots"\s+ON public\.brand_spots FOR SELECT TO anon, authenticated/, 'brand_spots SELECT only');
    assert.doesNotMatch(sqlContent, /CREATE POLICY.*ON public\.brand_spots FOR (UPDATE|INSERT|ALL) TO anon/, 'No anonymous UPDATE/INSERT on brand_spots');
    assert.match(sqlContent, /CREATE POLICY "Service role full access on sponsorship_orders"\s+ON public\.sponsorship_orders TO service_role/, 'Orders restricted to service role');
    assert.match(sqlContent, /CREATE POLICY "Service role full access on payment_transactions"\s+ON public\.payment_transactions TO service_role/, 'Transactions restricted to service role');
  });

  test('Public view sanitizes PII (sponsor_email and backer_email excluded)', () => {
    assert.match(setupContent, /CREATE OR REPLACE VIEW public\.public_sponsors_wall AS/, 'Public sponsors view declared');
    const viewDef = setupContent.substring(
      setupContent.indexOf('CREATE OR REPLACE VIEW public.public_sponsors_wall AS'),
      setupContent.indexOf('FROM public.sponsorship_orders')
    );
    assert.doesNotMatch(viewDef, /sponsor_email/i, 'View excludes sponsor_email');
    assert.doesNotMatch(viewDef, /backer_email/i, 'View excludes backer_email');
  });

  test('Functions are hardened with safe search_path and restricted execute permissions', () => {
    assert.match(rzpSqlContent, /SET search_path = public/, 'Functions use safe search_path = public');
    assert.match(rzpSqlContent, /REVOKE EXECUTE ON FUNCTION public\.atomic_reserve_spot\(INT, TEXT, INT\) FROM PUBLIC, anon;/, 'atomic_reserve_spot revoked from anon');
    assert.match(rzpSqlContent, /REVOKE EXECUTE ON FUNCTION public\.confirm_paid_order\(TEXT, TEXT, TEXT, INT, TEXT, JSONB\) FROM PUBLIC, anon;/, 'confirm_paid_order revoked from anon');
    assert.match(rzpSqlContent, /GRANT EXECUTE ON FUNCTION public\.confirm_paid_order\(TEXT, TEXT, TEXT, INT, TEXT, JSONB\) TO service_role;/, 'confirm_paid_order granted to service_role');
  });

  const hardeningMigrationPath = findMigration('production_readiness_hardening.sql');
  test('Production hardening migration implements refund workflow and sweep', () => {
    assert.ok(existsSync(hardeningMigrationPath), 'Production hardening migration exists');
    const hardeningContent = readFileSync(hardeningMigrationPath, 'utf8');

    assert.match(hardeningContent, /'refunded'/, 'Status check constraint includes refunded');
    assert.match(hardeningContent, /CREATE OR REPLACE FUNCTION public\.process_order_refund/, 'process_order_refund procedure implemented');
    assert.match(hardeningContent, /CREATE OR REPLACE FUNCTION public\.reconcile_unclaimed_payment/, 'reconcile_unclaimed_payment procedure implemented');
    assert.match(hardeningContent, /REVOKE EXECUTE ON FUNCTION public\.process_order_refund\(UUID, TEXT, TEXT\) FROM PUBLIC, anon;/, 'Refund procedure execution revoked from public/anon');
    assert.match(hardeningContent, /GRANT EXECUTE ON FUNCTION public\.process_order_refund\(UUID, TEXT, TEXT\) TO service_role;/, 'Refund procedure granted exclusively to service_role');
  });

  test('Migration filenames use 14-digit timestamps and sort in dependency order', () => {
    const files = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort();
    assert.equal(files.length >= 4, true, 'Versioned migration files exist');
    assert.match(files[0], /^\d{14}_secure_fundmymac_schema\.sql$/, 'First migration is baseline schema with 14-digit timestamp');
    assert.match(files[1], /^\d{14}_razorpay_integration\.sql$/, 'Second migration is razorpay integration with 14-digit timestamp');
    assert.match(files[2], /^\d{14}_production_readiness_hardening\.sql$/, 'Third migration is production hardening with 14-digit timestamp');
    assert.match(files[3], /^\d{14}_sponsorship_enquiries\.sql$/, 'Fourth migration is sponsorship enquiries with 14-digit timestamp');
    if (files[4]) {
      assert.match(files[4], /^\d{14}_auction_and_corner_tables\.sql$/, 'Fifth migration is auction and corner tables with 14-digit timestamp');
    }
  });

  test('Sponsorship enquiries table is protected by strict RLS and zero public SELECT', () => {
    const enquiryMigration = readFileSync('supabase/migrations/20261029040000_sponsorship_enquiries.sql', 'utf8');
    assert.match(enquiryMigration, /ALTER TABLE public\.sponsorship_enquiries ENABLE ROW LEVEL SECURITY;/, 'Enquiries table has RLS enabled');
    assert.match(enquiryMigration, /REVOKE SELECT, UPDATE, DELETE ON public\.sponsorship_enquiries FROM anon(?:,\s*authenticated)?;/, 'Anon and authenticated explicitly denied SELECT/PII access');
    assert.match(enquiryMigration, /CREATE POLICY "anon_can_insert_enquiry"/, 'Anon has INSERT policy with email validation');
  });

  test('Clean-database safety: legacy donations policy drop is safely guarded with existence check', () => {
    assert.match(sqlContent, /to_regclass\('public\.donations'\)/, 'Migration 1 guards donations drop with to_regclass');
    assert.match(setupContent, /to_regclass\('public\.donations'\)/, 'Setup script guards donations drop with to_regclass');
  });

  test('Consolidated setup script and hardening migration agree on atomic_reserve_spot expired sweep', () => {
    const hardeningContent = readFileSync(hardeningMigrationPath, 'utf8');
    assert.match(hardeningContent, /PERFORM public\.release_expired_reservations\(\);/, 'Hardening migration sweeps expired reservations');
    assert.match(setupContent, /PERFORM public\.release_expired_reservations\(\);/, 'Setup script sweeps expired reservations in atomic_reserve_spot');
  });

  test('Consolidated setup script and Razorpay migration agree on provider_order_id index', () => {
    assert.match(rzpSqlContent, /CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsorship_orders_provider_order_id/, 'Migration defines idx_sponsorship_orders_provider_order_id');
    assert.match(setupContent, /CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsorship_orders_provider_order_id/, 'Setup script defines idx_sponsorship_orders_provider_order_id');
  });
});
