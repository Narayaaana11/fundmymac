// =========================================================================
// Supabase Edge Function: verify-razorpay-payment
// Deploy via: supabase functions deploy verify-razorpay-payment
// =========================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. GET: Query Verified Order Status
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get('session_id') || url.searchParams.get('order_id');
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'session_id or order_id query param is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: order } = await supabaseClient
        .from('sponsorship_orders')
        .select('id, order_type, spot_id, amount_cents, currency, status, sponsor_name, sponsor_url, logo_url')
        .or(`provider_order_id.eq.${sessionId},provider_session_id.eq.${sessionId}`)
        .maybeSingle();

      if (order) {
        return new Response(JSON.stringify({
          found: true,
          paid: order.status === 'paid',
          order: {
            id: order.id,
            orderType: order.order_type,
            spotId: order.spot_id,
            amountCents: order.amount_cents,
            amountMinor: order.amount_cents,
            currency: order.currency,
            sponsorName: order.sponsor_name,
            sponsorUrl: order.sponsor_url,
            logoUrl: order.logo_url
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ found: false, paid: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Request size limit: 2.5MB maximum
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 2.5 * 1024 * 1024) {
      return new Response(JSON.stringify({ success: false, error: 'Payload exceeds 2.5MB limit' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. POST: Verify Razorpay Checkout Signature
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = await req.json();

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return new Response(JSON.stringify({ success: false, error: 'Missing verification fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Signature Verification
    if (razorpayKeySecret) {
      const isValid = await verifyHmacSha256(
        razorpayKeySecret,
        `${razorpayOrderId}|${razorpayPaymentId}`,
        razorpaySignature
      );
      if (!isValid) {
        return new Response(JSON.stringify({ success: false, verified: false, error: 'Invalid HMAC signature' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 2. Lookup order
    const { data: order, error: orderErr } = await supabaseClient
      .from('sponsorship_orders')
      .select('id, spot_id, amount_cents, currency, status')
      .or(`provider_order_id.eq.${razorpayOrderId},provider_session_id.eq.${razorpayOrderId}`)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ success: false, verified: false, error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Confirm paid order
    const { error: confirmErr } = await supabaseClient.rpc('confirm_paid_order', {
      p_provider_event_id: razorpayPaymentId,
      p_provider_session_id: razorpayOrderId,
      p_provider_payment_intent_id: razorpayPaymentId,
      p_amount_cents: order.amount_cents,
      p_currency: order.currency,
      p_raw_payload: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
    });

    if (confirmErr) {
      return new Response(JSON.stringify({ success: false, verified: false, error: confirmErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      verified: true,
      orderId: order.id,
      spotId: order.spot_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Verification error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
