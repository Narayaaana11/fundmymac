// =========================================================================
// Automated Test Suite: Concurrency, Inventory Locking & Reservation Expiry
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { StripePaymentAdapter } from '../src/server/payment/stripeAdapter.ts';

describe('Atomic Inventory Reservation & Concurrency Protection', () => {
  const adapter = new StripePaymentAdapter({ isTestMode: true });

  test('Concurrent reservation collision prevents duplicate spot sales', async () => {
    // 1. User A reserves Spot #10
    const userA = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 10,
      currency: 'usd',
      sponsorName: 'User A Corp',
      sponsorEmail: 'usera@corp.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(userA.success, true, 'User A reservation must succeed');

    // 2. User B concurrently attempts to reserve the same Spot #10
    const userB = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 10,
      currency: 'usd',
      sponsorName: 'User B Corp',
      sponsorEmail: 'userb@corp.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(userB.success, false, 'User B reservation must fail due to active lock');
    assert.match(userB.error || '', /Spot is currently held in checkout by another backer/);
  });

  test('Expired session releases lock and allows re-reservation', async () => {
    // 1. Create a session for Spot #15
    const session = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 15,
      currency: 'usd',
      sponsorName: 'Temporary User',
      sponsorEmail: 'temp@user.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(session.success, true);

    // 2. Simulate session expiry webhook
    const expiredWebhook = {
      id: `evt_exp_${Date.now()}`,
      type: 'checkout.session.expired',
      data: {
        object: {
          id: session.sessionId
        }
      }
    };

    const webhookRes = await adapter.processWebhookEvent(
      JSON.stringify(expiredWebhook),
      't=1700000000,v1=test_signature'
    );

    assert.equal(webhookRes.success, true);
    assert.equal(webhookRes.status, 'released');

    // 3. New user can now reserve Spot #15
    const newUser = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 15,
      currency: 'usd',
      sponsorName: 'New Backer',
      sponsorEmail: 'new@backer.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(newUser.success, true, 'Spot #15 must be claimable after expiry');
  });

  test('Paid spot is permanently locked against future checkout attempts', async () => {
    // 1. User claims Spot #18
    const session = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 18,
      currency: 'usd',
      sponsorName: 'Permanent Sponsor',
      sponsorEmail: 'permanent@sponsor.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    // 2. Process payment confirmation
    const paymentCompletedEvent = {
      id: `evt_pay_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: session.sessionId,
          amount_total: 10000,
          currency: 'usd'
        }
      }
    };

    const payRes = await adapter.processWebhookEvent(
      JSON.stringify(paymentCompletedEvent),
      't=1700000000,v1=test_signature'
    );

    assert.equal(payRes.success, true);
    assert.equal(payRes.status, 'confirmed');

    // 3. Any subsequent checkout attempt for Spot #18 MUST fail permanently
    const attempt = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 18,
      currency: 'usd',
      sponsorName: 'Late Buyer',
      sponsorEmail: 'late@buyer.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(attempt.success, false);
    assert.match(attempt.error || '', /Spot has already been sold/);
  });
});
