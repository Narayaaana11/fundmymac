// =========================================================================
// Automated Test Suite: Webhook Processing & Idempotency Protection
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { StripePaymentAdapter } from '../src/server/payment/stripeAdapter.ts';

describe('Webhook Signature Verification & Idempotent Processing', () => {
  const adapter = new StripePaymentAdapter({ isTestMode: true });

  test('Rejects webhooks with missing or invalid signatures', async () => {
    const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
    const res = await adapter.processWebhookEvent(payload, '');
    assert.equal(res.success, false);
    assert.match(res.error || '', /Missing or invalid signature header/);
  });

  test('Idempotent webhook delivery never counts one transaction twice', async () => {
    // 1. Create a session
    const session = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 7,
      currency: 'usd',
      sponsorName: 'Idempotent Corp',
      sponsorEmail: 'idem@corp.com',
      successUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel'
    });

    const eventId = `evt_unique_trans_${Date.now()}`;
    const webhookEvent = {
      id: eventId,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: session.sessionId,
          amount_total: 17500,
          currency: 'usd'
        }
      }
    };

    const payload = JSON.stringify(webhookEvent);
    const signature = 't=1700000000,v1=test_signature';

    // 2. First delivery: successfully processes and confirms
    const firstDelivery = await adapter.processWebhookEvent(payload, signature);
    assert.equal(firstDelivery.success, true);
    assert.equal(firstDelivery.status, 'confirmed');

    // 3. Second delivery (duplicate retry from Stripe / network glitch)
    const secondDelivery = await adapter.processWebhookEvent(payload, signature);
    assert.equal(secondDelivery.success, true);
    assert.equal(secondDelivery.status, 'already_processed', 'Duplicate event must return already_processed');

    // 4. Third delivery (further duplicate)
    const thirdDelivery = await adapter.processWebhookEvent(payload, signature);
    assert.equal(thirdDelivery.success, true);
    assert.equal(thirdDelivery.status, 'already_processed');
  });

  test('Unhandled event types are safely acknowledged and ignored', async () => {
    const unknownEvent = {
      id: `evt_unknown_${Date.now()}`,
      type: 'customer.subscription.created',
      data: { object: { id: 'sub_123' } }
    };

    const res = await adapter.processWebhookEvent(
      JSON.stringify(unknownEvent),
      't=1700000000,v1=test_signature'
    );

    assert.equal(res.success, true);
    assert.equal(res.status, 'ignored');
  });
});
