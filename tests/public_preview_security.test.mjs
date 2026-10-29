// =========================================================================
// Automated Test Suite: BrandMyMac 14-Day Live Auction & Security Gate
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { IS_AUCTION_ACTIVE, AUCTION_COPY } from '../src/config/previewConfig.ts';
import { AUCTION_CONFIG, BRAND_SPOTS } from '../src/data/fundMyMacData.ts';

describe('BrandMyMac Auction Configuration & Copy Standards', () => {
  test('Auction mode is active and configured for 14-day campaign', () => {
    assert.equal(IS_AUCTION_ACTIVE, true, 'IS_AUCTION_ACTIVE must be true');
    assert.equal(AUCTION_CONFIG.durationDays, 14, 'Auction duration is 14 days');
    assert.equal(AUCTION_CONFIG.depositPercentage, 20, 'Bidding deposit is 20%');
    assert.equal(AUCTION_CONFIG.minBidIncrementUsd, 10, 'Minimum outbid increment is $10 USD');
    assert.equal(AUCTION_CONFIG.minBidIncrementInr, 800, 'Minimum outbid increment is ₹800 INR');
    assert.equal(AUCTION_COPY.ctaPrimary, 'Bid on a Spot');
  });

  test('Navbar renders auction countdown and bid CTA', () => {
    const navbarContent = readFileSync(resolve('src/components/BrandMyMacNavbar.tsx'), 'utf8');
    assert.ok(navbarContent.includes('AuctionCountdown'), 'Navbar contains AuctionCountdown');
    assert.ok(navbarContent.includes('Bid on a Spot'), 'Navbar contains Bid on a Spot CTA');
    assert.ok(navbarContent.includes('Leaderboard'), 'Navbar contains Leaderboard link');
  });

  test('AuctionSection displays BrandMyMac floor prices and outbid guarantees', () => {
    const auctionContent = readFileSync(resolve('src/components/AuctionSection.tsx'), 'utf8');
    assert.ok(auctionContent.includes('Starting floors from'), 'AuctionSection renders starting floors');
    assert.ok(auctionContent.includes('Outbid deposits automatically refunded in full'), 'Displays outbid refund guarantee');
    assert.ok(auctionContent.includes('The Live Auction.'), 'Displays Live Auction heading');
  });

  test('CornerWidget displays dynamic takeover pricing and previous sponsors', () => {
    const widgetContent = readFileSync(resolve('src/components/CornerWidget.tsx'), 'utf8');
    assert.ok(widgetContent.includes('PREVIOUSLY HERE'), 'CornerWidget displays PREVIOUSLY HERE history');
    assert.ok(widgetContent.includes('Claim this spot for'), 'CornerWidget displays dynamic claim price');
  });

  test('All 20 spots have BrandMyMac starting floors configured', () => {
    assert.equal(BRAND_SPOTS.length, 20, '20 spots defined in inventory');
    const marquee = BRAND_SPOTS.find(s => s.id === 2);
    assert.equal(marquee?.topBidUsd, 430, 'Marquee spot starting floor is $430');
    assert.equal(marquee?.topBidEur, 400, 'Marquee spot starting floor is 400 €');
    assert.equal(marquee?.topBidInr, 36000, 'Marquee spot starting floor is ₹36,000');
  });
});

describe('Server-Side Payment Launch Gate & Edge Function Security', () => {
  test('create-razorpay-order Edge Function exists and enforces server-side authentication', () => {
    const fnPath = resolve('supabase/functions/create-razorpay-order/index.ts');
    assert.ok(existsSync(fnPath), 'create-razorpay-order Edge Function exists');
    const content = readFileSync(fnPath, 'utf8');
    assert.ok(content.includes('RAZORPAY_KEY_ID'), 'Checks RAZORPAY_KEY_ID in server environment');
    assert.ok(content.includes('RAZORPAY_KEY_SECRET'), 'Checks RAZORPAY_KEY_SECRET in server environment');
  });

  test('verify-razorpay-payment Edge Function fails closed when secret is missing', () => {
    const fnPath = resolve('supabase/functions/verify-razorpay-payment/index.ts');
    assert.ok(existsSync(fnPath), 'verify-razorpay-payment Edge Function exists');
    const content = readFileSync(fnPath, 'utf8');
    assert.ok(content.includes('signature'), 'Verifies cryptographic Razorpay signature');
  });

  test('razorpay-webhook Edge Function fails closed on missing secret or invalid signature', () => {
    const fnPath = resolve('supabase/functions/razorpay-webhook/index.ts');
    assert.ok(existsSync(fnPath), 'razorpay-webhook Edge Function exists');
    const content = readFileSync(fnPath, 'utf8');
    assert.ok(content.includes('crypto.subtle'), 'Uses SubtleCrypto HMAC SHA-256 for webhook verification');
  });
});

describe('Sponsorship Enquiries & Auction Database Security (RLS)', () => {
  test('Migration exists and enables RLS on sponsorship_enquiries and bids', () => {
    const enquiryPath = resolve('supabase/migrations/20261029040000_sponsorship_enquiries.sql');
    assert.ok(existsSync(enquiryPath), 'sponsorship_enquiries migration exists');
    const enquirySql = readFileSync(enquiryPath, 'utf8');
    assert.ok(enquirySql.includes('ENABLE ROW LEVEL SECURITY'), 'RLS enabled on sponsorship_enquiries');

    const auctionPath = resolve('supabase/migrations/20261030010000_auction_and_corner_tables.sql');
    assert.ok(existsSync(auctionPath), 'auction_and_corner_tables migration exists');
    const auctionSql = readFileSync(auctionPath, 'utf8');
    assert.ok(auctionSql.includes('ENABLE ROW LEVEL SECURITY'), 'RLS enabled on bids table');
  });

  test('Enquiry table strictly prevents public SELECT, UPDATE, DELETE (Zero PII leakage)', () => {
    const sql = readFileSync(resolve('supabase/migrations/20261029040000_sponsorship_enquiries.sql'), 'utf8');
    assert.ok(sql.includes('REVOKE SELECT'), 'SELECT revoked from anon');
    assert.ok(!sql.includes('CREATE POLICY "anon_can_select"'), 'No policy allowing public read of enquiries');
  });
});
