// =========================================================================
// Automated Test Suite: Public Preview Consistency & Payment Security Gate
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { IS_PUBLIC_PREVIEW, PREVIEW_COPY } from '../src/config/previewConfig.ts';
import { initiateCheckoutSession } from '../src/lib/checkoutApi.ts';

describe('Public Preview Configuration & Copy Standards', () => {
  test('Preview mode is active and immutable', () => {
    assert.equal(IS_PUBLIC_PREVIEW, true, 'IS_PUBLIC_PREVIEW must be true for public preview phase');
    assert.equal(PREVIEW_COPY.pricingBadge, 'Pricing Coming Soon');
    assert.equal(PREVIEW_COPY.actionComingSoon, 'Coming Soon');
    assert.equal(PREVIEW_COPY.ctaPrimary, 'Join the Waitlist');
    assert.equal(PREVIEW_COPY.heroSupportHeading, 'Sponsorships opening soon');
  });

  test('Navbar CTA invites visitors to join the waitlist', () => {
    const navbarContent = readFileSync(resolve('src/components/BrandMyMacNavbar.tsx'), 'utf8');
    assert.ok(navbarContent.includes('Join the Waitlist'), 'Navbar contains Join the Waitlist CTA');
    assert.ok(!navbarContent.includes('Buy Spot Now'), 'Navbar does not contain direct buy CTA');
  });

  test('AuctionSection replaces numerical pricing with Pricing Coming Soon', () => {
    const auctionContent = readFileSync(resolve('src/components/AuctionSection.tsx'), 'utf8');
    assert.ok(auctionContent.includes('Pricing Coming Soon'), 'AuctionSection renders Pricing Coming Soon');
    assert.ok(auctionContent.includes('Coming Soon'), 'Action button displays Coming Soon');
    assert.ok(auctionContent.includes('Opening Soon'), 'Row status displays Opening Soon');
    // Ensure no hardcoded $500 per space is advertised
    assert.ok(!auctionContent.includes('$500 per space'), 'Does not advertise unapproved $500 price');
  });

  test('SponsorsWall renders Pricing Coming Soon on all tiers', () => {
    const wallContent = readFileSync(resolve('src/components/SponsorsWall.tsx'), 'utf8');
    assert.ok(wallContent.includes('Pricing Coming Soon'), 'Tiers display Pricing Coming Soon');
    assert.ok(wallContent.includes('Join Waitlist ·'), 'Tier CTA button is Join Waitlist');
    assert.ok(wallContent.includes('Join the Campaign Waitlist'), 'General campaign waitlist button present');
  });

  test('MacbookDisplay tooltips and modals display Pricing Coming Soon', () => {
    const macbookContent = readFileSync(resolve('src/components/MacbookDisplay.tsx'), 'utf8');
    assert.ok(macbookContent.includes('Pricing Coming Soon'), 'MacbookDisplay tooltips show Pricing Coming Soon');
    assert.ok(macbookContent.includes('Opening Soon'), 'Spots status shows Opening Soon');
    assert.ok(macbookContent.includes('join the waitlist'), 'Tap hint invites visitors to join waitlist');
  });

  test('CornerWidget displays Pricing Coming Soon and Coming Soon CTAs', () => {
    const widgetContent = readFileSync(resolve('src/components/CornerWidget.tsx'), 'utf8');
    assert.ok(widgetContent.includes('Pricing Coming Soon'), 'CornerWidget pill displays Pricing Coming Soon');
    assert.ok(widgetContent.includes('Coming Soon'), 'CornerWidget buttons display Coming Soon');
  });

  test('LiveActivityTicker displays public preview status and Pricing Coming Soon', () => {
    const tickerContent = readFileSync(resolve('src/components/LiveActivityTicker.tsx'), 'utf8');
    assert.ok(tickerContent.includes('Public Preview'), 'Ticker displays Public Preview tag');
    assert.ok(tickerContent.includes('Pricing Coming Soon'), 'Ticker amounts display Pricing Coming Soon');
  });
});

describe('Client-Side Payment Block & Fail-Closed Behavior', () => {
  test('initiateCheckoutSession rejects purchase attempts in public preview', async () => {
    const res = await initiateCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 5,
      currency: 'inr',
      sponsorName: 'Test Sponsor',
      sponsorEmail: 'test@sponsor.com'
    });

    assert.equal(res.success, false, 'Checkout initiation must fail during preview');
    assert.equal(res.previewMode, true, 'Response must identify previewMode');
    assert.match(res.error || '', /Sponsorship checkout is currently opening soon/i);
  });

  test('Client-side parameters cannot override public preview checkout blocker', async () => {
    // Attempting to pass bypass flags or extra arguments
    const res = await initiateCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 1,
      currency: 'inr',
      sponsorName: 'Hacker Corp',
      sponsorEmail: 'hacker@bypass.com',
      // @ts-expect-error test bypass attempt
      bypassPreview: true,
      forceCheckout: true
    });

    assert.equal(res.success, false);
    assert.equal(res.previewMode, true);
  });
});

describe('Server-Side Payment Launch Gate & Edge Function Security', () => {
  test('create-razorpay-order Edge Function enforces server-side launch gate', () => {
    const edgeFuncContent = readFileSync(resolve('supabase/functions/create-razorpay-order/index.ts'), 'utf8');
    assert.ok(edgeFuncContent.includes("Deno.env.get('CHECKOUT_ENABLED') === 'true'"), 'Checks CHECKOUT_ENABLED launch gate');
    assert.ok(edgeFuncContent.includes('!isCheckoutEnabled'), 'Enforces isCheckoutEnabled guard');
    assert.ok(edgeFuncContent.includes('status: 403'), 'Returns HTTP 403 when checkout disabled');
    assert.ok(edgeFuncContent.includes('previewMode: true'), 'Identifies previewMode in response payload');
    // Ensure mock order insertion has been removed
    assert.ok(!edgeFuncContent.includes('MOCK ORDER CREATED IN DATABASE'), 'Mock order database creation removed');
  });

  test('verify-razorpay-payment Edge Function fails closed when secret is missing', () => {
    const verifyFuncContent = readFileSync(resolve('supabase/functions/verify-razorpay-payment/index.ts'), 'utf8');
    assert.ok(verifyFuncContent.includes('!razorpayKeySecret'), 'Checks presence of razorpayKeySecret');
    assert.ok(verifyFuncContent.includes('status: 500'), 'Returns HTTP 500 fail-closed when secret missing');
    assert.ok(verifyFuncContent.includes('status: 400'), 'Returns HTTP 400 on invalid cryptographic signature');
    assert.ok(!verifyFuncContent.includes('Signature verification bypassed'), 'No signature bypass logic');
  });

  test('razorpay-webhook Edge Function fails closed on missing secret or invalid signature', () => {
    const webhookContent = readFileSync(resolve('supabase/functions/razorpay-webhook/index.ts'), 'utf8');
    assert.ok(webhookContent.includes('!webhookSecret'), 'Checks presence of webhook secret');
    assert.ok(webhookContent.includes('status: 500'), 'Returns HTTP 500 fail-closed when webhook secret missing');
    assert.ok(webhookContent.includes('status: 400'), 'Returns HTTP 400 when webhook signature invalid');
  });
});

describe('Sponsorship Enquiries & Waitlist Database Security (RLS)', () => {
  const enquiryMigrationPath = resolve('supabase/migrations/20261029040000_sponsorship_enquiries.sql');

  test('Migration exists and enables RLS on sponsorship_enquiries', () => {
    assert.ok(existsSync(enquiryMigrationPath), 'Enquiry migration exists');
    const sql = readFileSync(enquiryMigrationPath, 'utf8');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.sponsorship_enquiries'), 'Creates table');
    assert.ok(sql.includes('ALTER TABLE public.sponsorship_enquiries ENABLE ROW LEVEL SECURITY;'), 'Enables RLS');
  });

  test('Enquiry table strictly prevents public SELECT, UPDATE, DELETE (Zero PII leakage)', () => {
    const sql = readFileSync(enquiryMigrationPath, 'utf8');
    assert.ok(sql.includes('REVOKE SELECT, UPDATE, DELETE ON public.sponsorship_enquiries FROM anon, authenticated;'), 'Revokes public reads/mutations');
    assert.ok(sql.includes('CREATE POLICY "anon_can_insert_enquiry"'), 'Allows public insert policy');
    assert.ok(sql.includes('CREATE POLICY "service_role_all_enquiries"'), 'Restricts management to service_role');
  });

  test('Enquiry table migration validates email and length constraints in SQL policy', () => {
    const sql = readFileSync(enquiryMigrationPath, 'utf8');
    assert.ok(sql.includes('char_length(name) <= 120'), 'Enforces name length limit in policy');
    assert.ok(sql.includes('char_length(message) <= 2000'), 'Enforces message length limit in policy');
    assert.ok(sql.includes('email ~*'), 'Enforces email regex in policy');
  });
});
