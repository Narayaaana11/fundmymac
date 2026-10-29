// =========================================================================
// Automated Test Suite: Razorpay Payment Adapter, Canonical Pricing & Signatures
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { RazorpayPaymentAdapter } from '../src/server/payment/razorpayAdapter.ts';
import {
  CANONICAL_SPOTS,
  CANONICAL_TIERS,
  getCanonicalSpotAmount
} from '../src/server/payment/canonicalCatalog.ts';
import {
  validateLogoFile,
  sanitizeSvgContent
} from '../src/server/payment/assetValidator.ts';

describe('Razorpay Payment Adapter & Canonical Pricing Enforcement', () => {
  const adapter = new RazorpayPaymentAdapter({
    isTestMode: true,
    razorpayKeyId: 'rzp_test_fixture_key',
    razorpayKeySecret: 'test_merchant_secret_12345'
  });

  test('Server enforces canonical spot prices in INR (paise) and foreign currencies', async () => {
    // Spot #1 canonical price: ₹21,000 (2,100,000 paise)
    const resInr = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 1,
      currency: 'inr',
      sponsorName: 'Acme AI India',
      sponsorEmail: 'founder@acme.ai',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(resInr.success, true);
    assert.equal(resInr.amountMinor, 2100000, 'Spot #1 canonical price in INR must be 2,100,000 paise (₹21,000)');

    // Spot #2 (Marquee) canonical price: ₹42,000 (4,200,000 paise)
    const resMarquee = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 2,
      currency: 'inr',
      sponsorName: 'Marquee Sponsor',
      sponsorEmail: 'ceo@sponsor.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(resMarquee.success, true);
    assert.equal(resMarquee.amountMinor, 4200000, 'Spot #2 (Marquee) in INR must be 4,200,000 paise (₹42,000)');

    // Spot #3 in USD: $250.00 (25,000 cents)
    const resUsd = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 3,
      currency: 'usd',
      sponsorName: 'US Backer',
      sponsorEmail: 'us@backer.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(resUsd.success, true);
    assert.equal(resUsd.amountMinor, 25000, 'Spot #3 canonical price in USD must be 25,000 cents ($250)');
  });

  test('All 20 spots have immutable canonical price definitions across INR, USD, and EUR', () => {
    assert.equal(Object.keys(CANONICAL_SPOTS).length, 20, 'Exactly 20 spots defined in canonical catalog');
    for (let id = 1; id <= 20; id++) {
      const amountInr = getCanonicalSpotAmount(id, 'inr');
      const amountUsd = getCanonicalSpotAmount(id, 'usd');
      const amountEur = getCanonicalSpotAmount(id, 'eur');
      assert.ok(amountInr >= 800000, `Spot ${id} must have canonical INR price (at least 800,000 paise)`);
      assert.ok(amountUsd > 0, `Spot ${id} must have positive USD amount`);
      assert.ok(amountEur > 0, `Spot ${id} must have positive EUR amount`);
    }
  });

  test('All sponsorship tiers have explicit canonical INR pricing', () => {
    assert.equal(CANONICAL_TIERS.corner.priceInrPaise, 600000, 'Corner tier is ₹6,000');
    assert.equal(CANONICAL_TIERS.charger.priceInrPaise, 1250000, 'Charger tier is ₹12,500');
    assert.equal(CANONICAL_TIERS.palm.priceInrPaise, 1500000, 'Palm tier is ₹15,000');
    assert.equal(CANONICAL_TIERS.lid.priceInrPaise, 2100000, 'Lid tier is ₹21,000');
    assert.equal(CANONICAL_TIERS.title.priceInrPaise, 4200000, 'Title tier is ₹42,000');
  });

  test('Rejects invalid checkout inputs gracefully', async () => {
    // Empty sponsor name
    const emptyName = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 3,
      currency: 'inr',
      sponsorName: '   ',
      sponsorEmail: 'valid@email.com'
    });
    assert.equal(emptyName.success, false);
    assert.match(emptyName.error || '', /Sponsor name is required/);

    // Oversized sponsor name
    const longName = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 3,
      currency: 'inr',
      sponsorName: 'A'.repeat(125),
      sponsorEmail: 'valid@email.com'
    });
    assert.equal(longName.success, false);
    assert.match(longName.error || '', /must not exceed 120 characters/);

    // Invalid email format
    const invalidEmail = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 3,
      currency: 'inr',
      sponsorName: 'Valid Name',
      sponsorEmail: 'not-an-email'
    });
    assert.equal(invalidEmail.success, false);
    assert.match(invalidEmail.error || '', /Valid sponsor email is required/);

    // Invalid spot ID
    const invalidSpot = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 999,
      currency: 'inr',
      sponsorName: 'Valid Name',
      sponsorEmail: 'valid@email.com'
    });
    assert.equal(invalidSpot.success, false);
    assert.match(invalidSpot.error || '', /Invalid or missing spotId/);

    // Unsupported currency
    const unsupportedCurr = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 3,
      currency: 'gbp',
      sponsorName: 'Valid Name',
      sponsorEmail: 'valid@email.com'
    });
    assert.equal(unsupportedCurr.success, false);
    assert.match(unsupportedCurr.error || '', /Unsupported currency/);

    // Donation below minimum INR (₹500 / 50,000 paise)
    const lowDonation = await adapter.createCheckoutSession({
      orderType: 'custom_donation',
      customAmountMinor: 20000, // ₹200
      currency: 'inr',
      sponsorName: 'Backer',
      sponsorEmail: 'backer@email.com'
    });
    assert.equal(lowDonation.success, false);
    assert.match(lowDonation.error || '', /Minimum contribution is/);
  });
});

describe('Razorpay Standard Checkout Signature Verification', () => {
  const secretKey = 'test_merchant_secret_12345';
  const adapter = new RazorpayPaymentAdapter({
    isTestMode: true,
    razorpayKeyId: 'rzp_test_123',
    razorpayKeySecret: secretKey
  });

  test('Valid HMAC-SHA256 signature confirms payment successfully', async () => {
    // 1. Create order
    const orderRes = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 4,
      currency: 'inr',
      sponsorName: 'Signature Verified Corp',
      sponsorEmail: 'sig@verified.com'
    });
    assert.equal(orderRes.success, true);

    const razorpayOrderId = orderRes.razorpayOrderId;
    const razorpayPaymentId = `pay_${Date.now()}`;

    // Compute canonical HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    // 2. Verify payment with valid signature
    const verifyRes = await adapter.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: expectedSignature,
      orderId: orderRes.orderId
    });

    assert.equal(verifyRes.success, true);
    assert.equal(verifyRes.verified, true);
    assert.equal(verifyRes.spotId, 4);
  });

  test('Tampered or invalid signature is strictly rejected', async () => {
    const razorpayOrderId = 'order_fake_123';
    const razorpayPaymentId = 'pay_fake_456';
    const forgedSignature = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

    const verifyRes = await adapter.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: forgedSignature
    });

    assert.equal(verifyRes.success, false);
    assert.equal(verifyRes.verified, false);
    assert.match(verifyRes.error || '', /signature verification failed/i);
  });

  test('Signature generated with wrong secret is rejected', async () => {
    const razorpayOrderId = 'order_valid_123';
    const razorpayPaymentId = 'pay_valid_456';
    const wrongSignature = crypto
      .createHmac('sha256', 'WRONG_SECRET_KEY')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const verifyRes = await adapter.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: wrongSignature
    });

    assert.equal(verifyRes.success, false);
    assert.equal(verifyRes.verified, false);
  });
});

describe('Logo Asset & File Upload Security Validation', () => {
  test('Enforces 2MB maximum file size limit', () => {
    const oversizedFile = { size: 3 * 1024 * 1024, type: 'image/png', name: 'big.png' };
    const res = validateLogoFile(oversizedFile);
    assert.equal(res.valid, false);
    assert.match(res.error || '', /exceeds maximum size of 2MB/);

    const validFile = { size: 500 * 1024, type: 'image/png', name: 'logo.png' };
    assert.equal(validateLogoFile(validFile).valid, true);
  });

  test('Rejects disallowed executable MIME types', () => {
    const exeFile = { size: 1000, type: 'application/x-msdownload', name: 'malware.exe' };
    assert.equal(validateLogoFile(exeFile).valid, false);

    const htmlFile = { size: 1000, type: 'text/html', name: 'page.html' };
    assert.equal(validateLogoFile(htmlFile).valid, false);
  });

  test('Sanitizes SVG content and detects dangerous scripts', () => {
    const maliciousSvg = '<svg><script>alert("XSS")</script><circle r="10"/></svg>';
    const check1 = sanitizeSvgContent(maliciousSvg);
    assert.equal(check1.safe, false);

    const inlineEventHandlerSvg = '<svg><image href="x" onerror="alert(1)" /></svg>';
    const check2 = sanitizeSvgContent(inlineEventHandlerSvg);
    assert.equal(check2.safe, false);

    const cleanSvg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>';
    const check3 = sanitizeSvgContent(cleanSvg);
    assert.equal(check3.safe, true);
  });
});
