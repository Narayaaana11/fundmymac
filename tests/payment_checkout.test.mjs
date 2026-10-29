// =========================================================================
// Automated Test Suite: Payment Adapter, Canonical Pricing & Asset Validation
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { StripePaymentAdapter } from '../src/server/payment/stripeAdapter.ts';
import {
  CANONICAL_SPOTS,
  CANONICAL_TIERS,
  MIN_DONATION_CENTS,
  getCanonicalSpotAmount
} from '../src/server/payment/canonicalCatalog.ts';
import {
  validateLogoFile,
  validateDataUrl,
  sanitizeSvgContent
} from '../src/server/payment/assetValidator.ts';

describe('Payment Adapter & Canonical Pricing Enforcement', () => {
  const adapter = new StripePaymentAdapter({ isTestMode: true });

  test('Server enforces canonical spot prices regardless of client amount', async () => {
    // Spot 1 should always be $250 / 230€ (25000 / 23000 cents)
    const resUsd = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 1,
      currency: 'usd',
      sponsorName: 'Acme AI',
      sponsorEmail: 'founder@acme.ai',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(resUsd.success, true);
    assert.equal(resUsd.amountCents, 25000, 'Spot #1 canonical price in USD must be 25000 cents ($250)');

    const resEur = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 2,
      currency: 'eur',
      sponsorName: 'Acme AI',
      sponsorEmail: 'founder@acme.ai',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(resEur.success, true);
    assert.equal(resEur.amountCents, 46000, 'Spot #2 (Marquee) canonical price in EUR must be 46000 cents (460 €)');
  });

  test('All 20 spots have immutable canonical price definitions', () => {
    assert.equal(Object.keys(CANONICAL_SPOTS).length, 20, 'Exactly 20 spots defined in canonical catalog');
    for (let id = 1; id <= 20; id++) {
      const amountUsd = getCanonicalSpotAmount(id, 'usd');
      const amountEur = getCanonicalSpotAmount(id, 'eur');
      assert.ok(amountUsd > 0, `Spot ${id} must have positive USD amount`);
      assert.ok(amountEur > 0, `Spot ${id} must have positive EUR amount`);
    }
  });

  test('Rejects invalid checkout inputs gracefully', async () => {
    // Empty sponsor name
    const emptyName = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 3,
      currency: 'usd',
      sponsorName: '   ',
      sponsorEmail: 'valid@email.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });
    assert.equal(emptyName.success, false);
    assert.match(emptyName.error || '', /Sponsor name is required/);

    // Invalid email format
    const invalidEmail = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 3,
      currency: 'usd',
      sponsorName: 'Valid Name',
      sponsorEmail: 'not-an-email',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });
    assert.equal(invalidEmail.success, false);
    assert.match(invalidEmail.error || '', /Valid sponsor email is required/);

    // Invalid spot ID
    const invalidSpot = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 999,
      currency: 'usd',
      sponsorName: 'Valid Name',
      sponsorEmail: 'valid@email.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });
    assert.equal(invalidSpot.success, false);
    assert.match(invalidSpot.error || '', /Invalid or missing spotId/);

    // Donation below minimum ($5 / 500 cents)
    const lowDonation = await adapter.createCheckoutSession({
      orderType: 'custom_donation',
      customAmountCents: 200, // $2.00
      currency: 'usd',
      sponsorName: 'Backer',
      sponsorEmail: 'backer@email.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });
    assert.equal(lowDonation.success, false);
    assert.match(lowDonation.error || '', /Minimum contribution is/);
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
