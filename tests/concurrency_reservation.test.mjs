// =========================================================================
// Automated Test Suite: Concurrency, Inventory Locking & Reservation Expiry
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RazorpayPaymentAdapter } from '../src/server/payment/razorpayAdapter.ts';

describe('Atomic Inventory Reservation & Concurrency Protection', () => {
  const adapter = new RazorpayPaymentAdapter({ isTestMode: true });

  test('Concurrent reservation collision prevents duplicate spot sales', async () => {
    // 1. User A reserves Spot #10
    const userA = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 10,
      currency: 'inr',
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
      currency: 'inr',
      sponsorName: 'User B Corp',
      sponsorEmail: 'userb@corp.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(userB.success, false, 'User B reservation must fail due to active lock');
    assert.match(userB.error || '', /Spot is currently held in checkout by another backer/);
  });

  test('Expired/failed session releases lock and allows re-reservation', async () => {
    // 1. Create a session for Spot #15
    const session = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 15,
      currency: 'inr',
      sponsorName: 'Temporary User',
      sponsorEmail: 'temp@user.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(session.success, true);

    // 2. Simulate payment failed webhook event
    const failedWebhook = {
      entity: 'event',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_fail_${Date.now()}`,
            order_id: session.razorpayOrderId,
            status: 'failed'
          }
        }
      }
    };

    const webhookRes = await adapter.processWebhookEvent(
      JSON.stringify(failedWebhook),
      'sig_test_simulated'
    );

    assert.equal(webhookRes.success, true);
    assert.equal(webhookRes.status, 'released');

    // 3. New user can now reserve Spot #15
    const newUser = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 15,
      currency: 'inr',
      sponsorName: 'New Backer',
      sponsorEmail: 'new@backer.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(newUser.success, true, 'Spot #15 must be claimable after previous failure release');
  });

  test('Paid spot is permanently locked against future checkout attempts', async () => {
    // 1. User claims Spot #18
    const session = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 18,
      currency: 'inr',
      sponsorName: 'Permanent Sponsor',
      sponsorEmail: 'permanent@sponsor.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    // 2. Process payment confirmation via verifyPaymentSignature
    const payRes = await adapter.verifyPaymentSignature({
      razorpayOrderId: session.razorpayOrderId,
      razorpayPaymentId: `pay_perm_${Date.now()}`,
      razorpaySignature: 'sig_test_valid',
      orderId: session.orderId
    });

    assert.equal(payRes.success, true);
    assert.equal(payRes.verified, true);

    // 3. Any subsequent checkout attempt for Spot #18 MUST fail permanently
    const attempt = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 18,
      currency: 'inr',
      sponsorName: 'Late Buyer',
      sponsorEmail: 'late@buyer.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    assert.equal(attempt.success, false);
    assert.match(attempt.error || '', /Spot has already been sold/);
  });
});
