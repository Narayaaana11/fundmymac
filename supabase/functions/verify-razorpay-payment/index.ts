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
