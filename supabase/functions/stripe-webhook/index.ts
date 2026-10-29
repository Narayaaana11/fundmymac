// =========================================================================
// Supabase Edge Function: stripe-webhook
// Deploy via: supabase functions deploy stripe-webhook
// =========================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import Stripe from 'https://esm.sh/stripe@14.19.0?target=deno';

serve(async (req) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const signature = req.headers.get('stripe-signature');

  if (!stripeKey || !endpointSecret || !signature) {
    return new Response('Webhook secrets or signature missing', { status: 400 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid signature';
    return new Response(`Webhook Signature Error: ${msg}`, { status: 400 });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;
    const amountTotal = session.amount_total ?? 0;
    const currency = (session.currency ?? 'usd').toLowerCase();
    const paymentIntentId = (session.payment_intent as string) ?? `pi_${sessionId}`;

    const { data: confirmResult, error: confirmErr } = await supabaseClient.rpc('confirm_paid_order', {
      p_provider_event_id: event.id,
      p_provider_session_id: sessionId,
      p_provider_payment_intent_id: paymentIntentId,
      p_amount_cents: amountTotal,
      p_currency: currency,
      p_raw_payload: event
    });

    if (confirmErr) {
      return new Response(`Error confirming order: ${confirmErr.message}`, { status: 500 });
    }

    return new Response(JSON.stringify({ received: true, result: confirmResult }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    await supabaseClient
      .from('sponsorship_orders')
      .update({ status: 'expired' })
      .eq('provider_session_id', session.id);

    await supabaseClient
      .from('brand_spots')
      .update({
        status: 'available',
        reserved_until: null,
        reserved_by_session_id: null
      })
      .eq('reserved_by_session_id', session.id);

    return new Response(JSON.stringify({ received: true, status: 'expired_released' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ received: true, ignored: event.type }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
