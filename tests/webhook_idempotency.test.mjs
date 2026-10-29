// =========================================================================
// Automated Test Suite: Razorpay Webhook Signature & Idempotency Protection
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { RazorpayPaymentAdapter } from '../src/server/payment/razorpayAdapter.ts';

describe('Razorpay Webhook Signature Verification & Idempotency Protection', () => {
  const webhookSecret = 'rzp_whsec_production_secret_999';
  const adapter = new RazorpayPaymentAdapter({
    isTestMode: false,
    razorpayKeyId: 'rzp_test_fixture',
    razorpayWebhookSecret: webhookSecret
  });

  function signPayload(body, secret) {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  test('Rejects webhooks with missing signature header', async () => {
    const payload = JSON.stringify({ event: 'order.paid' });
    const res = await adapter.processWebhookEvent(payload, '');
    assert.equal(res.success, false);
    assert.match(res.error || '', /Missing X-Razorpay-Signature/);
  });

  test('Rejects webhooks with invalid or tampered signature', async () => {
    const payload = JSON.stringify({ event: 'order.paid', id: 'evt_tampered' });
    const invalidSig = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const res = await adapter.processWebhookEvent(payload, invalidSig);
    assert.equal(res.success, false);
    assert.match(res.error || '', /Invalid webhook signature/);
  });

  test('Rejects webhooks signed with incorrect secret', async () => {
    const payload = JSON.stringify({ event: 'order.paid', id: 'evt_wrong_sec' });
    const signatureWithWrongSecret = signPayload(payload, 'wrong_secret_123');
    const res = await adapter.processWebhookEvent(payload, signatureWithWrongSecret);
    assert.equal(res.success, false);
    assert.match(res.error || '', /Invalid webhook signature/);
  });

  test('Valid HMAC-SHA256 signature is authenticated and processes order.paid', async () => {
    // 1. Create pending order for Spot #6
    const order = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 6,
      currency: 'inr',
      sponsorName: 'Webhook Verified Backer',
      sponsorEmail: 'webhook@verified.com'
    });
    assert.equal(order.success, true);

    const paymentId = `pay_${Date.now()}`;
    const webhookPayload = JSON.stringify({
      entity: 'event',
      account_id: 'acc_test',
      event: 'order.paid',
      contains: ['payment', 'order'],
      payload: {
        payment: {
          entity: {
            id: paymentId,
            entity: 'payment',
            amount: 1500000,
            currency: 'INR',
            status: 'captured',
            order_id: order.razorpayOrderId
          }
        },
        order: {
          entity: {
            id: order.razorpayOrderId,
            entity: 'order',
            amount: 1500000,
            currency: 'INR',
            status: 'paid'
          }
        }
      },
      created_at: Math.floor(Date.now() / 1000)
    });

    const validSig = signPayload(webhookPayload, webhookSecret);

    // 2. Deliver webhook
    const res = await adapter.processWebhookEvent(webhookPayload, validSig);
    assert.equal(res.success, true);
    assert.equal(res.status, 'confirmed');
    assert.equal(res.spotId, 6);

    // 3. Verify order is paid
    const status = await adapter.getVerifiedOrderStatus(order.razorpayOrderId);
    assert.equal(status.found, true);
    assert.equal(status.paid, true);
  });

  test('Idempotent webhook delivery never counts one payment twice', async () => {
    // 1. Create order
    const order = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 8,
      currency: 'inr',
      sponsorName: 'Idempotent Sponsor',
      sponsorEmail: 'idem@sponsor.com'
    });

    const paymentId = `pay_idem_${Date.now()}`;
    const webhookPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            amount: 1250000,
            currency: 'INR',
            status: 'captured',
            order_id: order.razorpayOrderId
          }
        }
      }
    });

    const signature = signPayload(webhookPayload, webhookSecret);

    // 2. First delivery: successfully confirms
    const firstDelivery = await adapter.processWebhookEvent(webhookPayload, signature);
    assert.equal(firstDelivery.success, true);
    assert.equal(firstDelivery.status, 'confirmed');

    // 3. Duplicate delivery (network retry from Razorpay)
    const duplicateDelivery = await adapter.processWebhookEvent(webhookPayload, signature);
    assert.equal(duplicateDelivery.success, true);
    assert.equal(duplicateDelivery.status, 'already_processed', 'Duplicate webhook must return already_processed');

    // 4. Third delivery
    const thirdDelivery = await adapter.processWebhookEvent(webhookPayload, signature);
    assert.equal(thirdDelivery.success, true);
    assert.equal(thirdDelivery.status, 'already_processed');
  });

  test('Payment failure event releases spot reservation safely', async () => {
    const order = await adapter.createCheckoutSession({
      orderType: 'spot_sponsorship',
      spotId: 9,
      currency: 'inr',
      sponsorName: 'Failed Order Sponsor',
      sponsorEmail: 'failed@sponsor.com'
    });

    const failPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_failed_${Date.now()}`,
            order_id: order.razorpayOrderId,
            status: 'failed'
          }
        }
      }
    });

    const signature = signPayload(failPayload, webhookSecret);
    const failRes = await adapter.processWebhookEvent(failPayload, signature);
    assert.equal(failRes.success, true);
    assert.equal(failRes.status, 'released');
  });

  test('Unhandled event types are safely acknowledged and ignored', async () => {
    const unknownEvent = JSON.stringify({
      entity: 'event',
      event: 'settlement.processed',
      payload: {}
    });

    const signature = signPayload(unknownEvent, webhookSecret);
    const res = await adapter.processWebhookEvent(unknownEvent, signature);
    assert.equal(res.success, true);
    assert.equal(res.status, 'ignored');
  });
});
