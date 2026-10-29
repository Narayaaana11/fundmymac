// =========================================================================
// Automated Test Suite: Database Security & RLS Policy Enforcement
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Database Security & Row-Level Security (RLS) Policies', () => {
  const secureSchemaMigrationPath = resolve('supabase/migrations/20261029_secure_fundmymac_schema.sql');
  const razorpayMigrationPath = resolve('supabase/migrations/20261029_razorpay_integration.sql');
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

  const hardeningMigrationPath = resolve('supabase/migrations/20261029_production_readiness_hardening.sql');
  test('Production hardening migration implements refund workflow and sweep', () => {
    assert.ok(existsSync(hardeningMigrationPath), 'Production hardening migration exists');
    const hardeningContent = readFileSync(hardeningMigrationPath, 'utf8');

    assert.match(hardeningContent, /'refunded'/, 'Status check constraint includes refunded');
    assert.match(hardeningContent, /CREATE OR REPLACE FUNCTION public\.process_order_refund/, 'process_order_refund procedure implemented');
    assert.match(hardeningContent, /CREATE OR REPLACE FUNCTION public\.reconcile_unclaimed_payment/, 'reconcile_unclaimed_payment procedure implemented');
    assert.match(hardeningContent, /REVOKE EXECUTE ON FUNCTION public\.process_order_refund\(UUID, TEXT, TEXT\) FROM PUBLIC, anon;/, 'Refund procedure execution revoked from public/anon');
    assert.match(hardeningContent, /GRANT EXECUTE ON FUNCTION public\.process_order_refund\(UUID, TEXT, TEXT\) TO service_role;/, 'Refund procedure granted exclusively to service_role');
  });
});
