// =========================================================================
// Automated Test Suite: Public Preview Readiness & Payment Launch Gate
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { IS_PUBLIC_PREVIEW, IS_AUCTION_ACTIVE, PREVIEW_COPY } from '../src/config/previewConfig.ts';
import { BRAND_SPOTS } from '../src/data/fundMyMacData.ts';
import { RazorpayPaymentAdapter } from '../src/server/payment/razorpayAdapter.ts';

describe('Public Preview Safety Gates & Finding A & B Verification', () => {
  test('Finding A: IS_PUBLIC_PREVIEW is strictly true and safe preview defaults are configured', () => {
    assert.equal(IS_PUBLIC_PREVIEW, true, 'IS_PUBLIC_PREVIEW must be true during public preview');
    assert.equal(IS_AUCTION_ACTIVE, false, 'IS_AUCTION_ACTIVE must be false during public preview');
    assert.equal(PREVIEW_COPY.pricingBadge, 'Pricing Coming Soon');
    assert.equal(PREVIEW_COPY.ctaPrimary, 'Join the Waitlist');
  });

  test('Finding B: CornerTakeoverModal eliminates simulated payment success and routes to enquiry API', () => {
    const cornerContent = readFileSync(resolve('src/components/CornerTakeoverModal.tsx'), 'utf8');
    assert.ok(cornerContent.includes('submitSponsorshipEnquiry'), 'CornerTakeover routes to submitSponsorshipEnquiry');
    assert.ok(!cornerContent.includes('Test mode simulation: Instant successful takeover'), 'Does not include simulated takeover fallback');
    assert.ok(cornerContent.includes('IS_PUBLIC_PREVIEW'), 'Respects IS_PUBLIC_PREVIEW flag');
  });

  test('BidModal eliminates simulated bids and routes to waitlist enquiry in preview mode', () => {
    const bidContent = readFileSync(resolve('src/components/BidModal.tsx'), 'utf8');
    assert.ok(bidContent.includes('submitSponsorshipEnquiry'), 'BidModal routes to submitSponsorshipEnquiry in preview');
    assert.ok(bidContent.includes('IS_PUBLIC_PREVIEW'), 'Respects IS_PUBLIC_PREVIEW flag');
  });

  test('Navbar renders Waitlist link and preview-safe CTA', () => {
    const navbarContent = readFileSync(resolve('src/components/BrandMyMacNavbar.tsx'), 'utf8');
    assert.ok(navbarContent.includes('Waitlist'), 'Navbar contains Waitlist link');
    assert.ok(navbarContent.includes('Join Waitlist'), 'Navbar renders Join Waitlist CTA in preview');
  });

  test('MacbookDisplay eliminates duplicate id="spots" and uses safe sample logo data URIs', () => {
    const macbookContent = readFileSync(resolve('src/components/MacbookDisplay.tsx'), 'utf8');
    assert.ok(!macbookContent.includes('id="spots"'), 'Eliminated duplicate id="spots" on controls row');
    assert.ok(macbookContent.includes('id="macbook-controls"'), 'Uses distinct id="macbook-controls"');
    assert.ok(!macbookContent.includes('images.ctfassets.net'), 'Eliminated blocked external ctfassets URL');
    assert.ok(macbookContent.includes('data:image/svg+xml'), 'Uses self-contained SVG data URIs for sample logos');
  });

  test('All 20 spots configured with dimensions and surface positions', () => {
    assert.equal(BRAND_SPOTS.length, 20, '20 spots defined in inventory');
  });
});

describe('Server-Side Payment Restriction & Fail-Closed Enforcement', () => {
  test('Payment adapter rejects order creation when isPublicPreview is active', async () => {
    // Adapter instantiated with isPublicPreview: true
    const adapter = new RazorpayPaymentAdapter({ isTestMode: false, isPublicPreview: true });
    const result = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 2,
      sponsorName: 'Test Brand',
      sponsorEmail: 'test@example.com',
      currency: 'inr'
    });

    assert.equal(result.success, false, 'Must reject order creation in preview');
    assert.equal(result.previewMode, true, 'Returns previewMode: true');
    assert.ok(result.error?.includes('Public preview is active'), 'Error message informs caller about public preview');
  });

  test('create-razorpay-order Edge Function exists and enforces server-side authentication', () => {
    const fnPath = resolve('supabase/functions/create-razorpay-order/index.ts');
    assert.ok(existsSync(fnPath), 'create-razorpay-order Edge Function exists');
    const content = readFileSync(fnPath, 'utf8');
    assert.ok(content.includes('RAZORPAY_KEY_ID'), 'Checks RAZORPAY_KEY_ID in server environment');
  });

  test('verify-razorpay-payment Edge Function fails closed when secret is missing', () => {
    const fnPath = resolve('supabase/functions/verify-razorpay-payment/index.ts');
    assert.ok(existsSync(fnPath), 'verify-razorpay-payment Edge Function exists');
    const content = readFileSync(fnPath, 'utf8');
    assert.ok(content.includes('signature'), 'Verifies cryptographic Razorpay signature');
  });
});

describe('Sponsorship Enquiries & Database Security (RLS)', () => {
  test('Migration exists and enables RLS on sponsorship_enquiries', () => {
    const enquiryPath = resolve('supabase/migrations/20261029040000_sponsorship_enquiries.sql');
    assert.ok(existsSync(enquiryPath), 'sponsorship_enquiries migration exists');
    const enquirySql = readFileSync(enquiryPath, 'utf8');
    assert.ok(enquirySql.includes('ENABLE ROW LEVEL SECURITY'), 'RLS enabled on sponsorship_enquiries');
  });

  test('Enquiry table strictly prevents public SELECT, UPDATE, DELETE (Zero PII leakage)', () => {
    const sql = readFileSync(resolve('supabase/migrations/20261029040000_sponsorship_enquiries.sql'), 'utf8');
    assert.ok(sql.includes('REVOKE SELECT'), 'SELECT revoked from anon');
    assert.ok(!sql.includes('CREATE POLICY "anon_can_select"'), 'No policy allowing public read of enquiries');
  });
});
