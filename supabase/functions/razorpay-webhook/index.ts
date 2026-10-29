// =========================================================================
// Supabase Edge Function: razorpay-webhook
// Deploy via: supabase functions deploy razorpay-webhook
// =========================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';

async function verifyHmacSha256(secret: string, message: string, expectedHex: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuf = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const hex = Array.from(new Uint8Array(signatureBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.toLowerCase() === expectedHex.toLowerCase();
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    const signature = req.headers.get('x-razorpay-signature');

    const rawBody = await req.text();

    if (webhookSecret && signature) {
      const isValid = await verifyHmacSha256(webhookSecret, rawBody, signature);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;

    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      const razorpayOrderId = orderEntity?.id || paymentEntity?.order_id;
      const paymentId = paymentEntity?.id || `pay_${razorpayOrderId}`;
      const amount = paymentEntity?.amount || orderEntity?.amount || 0;
      const currency = (paymentEntity?.currency || orderEntity?.currency || 'inr').toLowerCase();
      const eventId = paymentId;

      if (!razorpayOrderId) {
        return new Response(JSON.stringify({ error: 'Missing order_id' }), { status: 400 });
      }

      await supabaseClient.rpc('confirm_paid_order', {
        p_provider_event_id: eventId,
        p_provider_session_id: razorpayOrderId,
        p_provider_payment_intent_id: paymentId,
        p_amount_cents: amount,
        p_currency: currency,
        p_raw_payload: event
      });

      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (eventType === 'payment.failed') {
      const orderId = paymentEntity?.order_id;
      if (orderId) {
        await supabaseClient.from('sponsorship_orders')
          .update({ status: 'failed' })
          .or(`provider_order_id.eq.${orderId},provider_session_id.eq.${orderId}`);

        await supabaseClient.from('brand_spots')
          .update({ status: 'available', reserved_until: null, reserved_by_session_id: null })
          .eq('reserved_by_session_id', orderId);
      }
      return new Response(JSON.stringify({ status: 'handled_failure' }), { status: 200 });
    }

    return new Response(JSON.stringify({ status: 'ignored' }), { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook error';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
