// =========================================================================
// Automated Test Suite: Database Security & RLS Policy Enforcement
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Database Security & Row-Level Security (RLS) Policies', () => {
  const migrationPath = resolve('supabase/migrations/20261029_secure_fundmymac_schema.sql');
  const setupSqlPath = resolve('supabase-setup.sql');

  test('Migration and setup SQL files exist', () => {
    assert.ok(existsSync(migrationPath), 'Migration file exists');
    assert.ok(existsSync(setupSqlPath), 'Root supabase-setup.sql exists');
  });

  const sqlContent = readFileSync(migrationPath, 'utf8');

  test('All critical tables have ROW LEVEL SECURITY enabled', () => {
    assert.match(sqlContent, /ALTER TABLE public\.site_stats ENABLE ROW LEVEL SECURITY;/, 'site_stats RLS enabled');
    assert.match(sqlContent, /ALTER TABLE public\.brand_spots ENABLE ROW LEVEL SECURITY;/, 'brand_spots RLS enabled');
    assert.match(sqlContent, /ALTER TABLE public\.sponsorship_orders ENABLE ROW LEVEL SECURITY;/, 'sponsorship_orders RLS enabled');
    assert.match(sqlContent, /ALTER TABLE public\.payment_transactions ENABLE ROW LEVEL SECURITY;/, 'payment_transactions RLS enabled');
  });

  test('Unsafe legacy anonymous write policies are explicitly dropped', () => {
    assert.match(sqlContent, /DROP POLICY IF EXISTS "Allow public update on brand_spots"/, 'Drops public update on brand_spots');
    assert.match(sqlContent, /DROP POLICY IF EXISTS "Allow public insert on donations"/, 'Drops public insert on donations');
    assert.match(sqlContent, /DROP POLICY IF EXISTS "Allow public read on donations"/, 'Drops public read on donations');
  });

  test('Strict least-privilege policies deny anonymous mutations', () => {
    // Only SELECT policies exist for anon on public tables
    assert.match(sqlContent, /CREATE POLICY "Public read site_stats"\s+ON public\.site_stats FOR SELECT TO anon, authenticated/, 'site_stats SELECT only');
    assert.match(sqlContent, /CREATE POLICY "Public read brand_spots"\s+ON public\.brand_spots FOR SELECT TO anon, authenticated/, 'brand_spots SELECT only');
    
    // No public UPDATE or INSERT policy exists for brand_spots
    assert.doesNotMatch(sqlContent, /CREATE POLICY.*ON public\.brand_spots FOR (UPDATE|INSERT|ALL) TO anon/, 'No anonymous UPDATE/INSERT on brand_spots');
    
    // Orders and Transactions tables restricted exclusively to service_role
    assert.match(sqlContent, /CREATE POLICY "Service role full access on sponsorship_orders"\s+ON public\.sponsorship_orders TO service_role/, 'Orders restricted to service role');
    assert.match(sqlContent, /CREATE POLICY "Service role full access on payment_transactions"\s+ON public\.payment_transactions TO service_role/, 'Transactions restricted to service role');
  });

  test('Public view sanitizes PII (sponsor_email and backer_email excluded)', () => {
    assert.match(sqlContent, /CREATE OR REPLACE VIEW public\.public_sponsors_wall AS/, 'Public sponsors view declared');
    // Ensure email is not selected in the public view
    const viewDef = sqlContent.substring(
      sqlContent.indexOf('CREATE OR REPLACE VIEW public.public_sponsors_wall AS'),
      sqlContent.indexOf('FROM public.sponsorship_orders')
    );
    assert.doesNotMatch(viewDef, /sponsor_email/i, 'View excludes sponsor_email');
    assert.doesNotMatch(viewDef, /backer_email/i, 'View excludes backer_email');
  });

  test('Atomic spot reservation procedure includes row-level locking', () => {
    assert.match(sqlContent, /CREATE OR REPLACE FUNCTION public\.atomic_reserve_spot/, 'atomic_reserve_spot function declared');
    assert.match(sqlContent, /FOR UPDATE;/, 'Exclusive row lock applied during reservation check');
    assert.match(sqlContent, /p_hold_seconds INT DEFAULT 900/, '15 minute reservation timeout default');
  });

  test('Payment confirmation procedure enforces event idempotency', () => {
    assert.match(sqlContent, /CREATE OR REPLACE FUNCTION public\.confirm_paid_order/, 'confirm_paid_order function declared');
    assert.match(sqlContent, /IF EXISTS \(SELECT 1 FROM public\.payment_transactions WHERE provider_event_id = p_provider_event_id\)/, 'Idempotency check prevents duplicate webhook execution');
    assert.match(sqlContent, /provider_event_id TEXT NOT NULL UNIQUE/, 'Unique constraint on provider event ID');
  });
});
