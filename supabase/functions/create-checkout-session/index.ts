// =========================================================================
// Supabase Edge Function: create-checkout-session
// Deploy via: supabase functions deploy create-checkout-session
// =========================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import Stripe from 'https://esm.sh/stripe@14.19.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CANONICAL_SPOTS: Record<number, { priceUsdCents: number; priceEurCents: number; name: string }> = {
  1: { priceUsdCents: 25000, priceEurCents: 23000, name: 'Top-Left Banner' },
  2: { priceUsdCents: 50000, priceEurCents: 46000, name: 'Marquee — Above Apple Logo' },
  3: { priceUsdCents: 25000, priceEurCents: 23000, name: 'Top-Right Banner' },
  4: { priceUsdCents: 10000, priceEurCents: 9000, name: 'Upper Left Mini-Strip' },
  5: { priceUsdCents: 10000, priceEurCents: 9000, name: 'Upper Right Mini-Strip' },
  6: { priceUsdCents: 17500, priceEurCents: 16000, name: 'Mid Left Flank' },
  7: { priceUsdCents: 17500, priceEurCents: 16000, name: 'Mid Right Flank' },
  8: { priceUsdCents: 15000, priceEurCents: 13800, name: 'Apple Left Adjacent' },
  9: { priceUsdCents: 15000, priceEurCents: 13800, name: 'Apple Right Adjacent' },
  10: { priceUsdCents: 22500, priceEurCents: 21000, name: 'Lower Deck Center' },
  11: { priceUsdCents: 10000, priceEurCents: 9000, name: 'Left Palm Outer Top' },
  12: { priceUsdCents: 10000, priceEurCents: 9000, name: 'Left Palm Outer Bottom' },
  13: { priceUsdCents: 10000, priceEurCents: 9000, name: 'Left Palm Inner Top' },
  14: { priceUsdCents: 10000, priceEurCents: 9000, name: 'Left Palm Inner Bottom' },
  15: { priceUsdCents: 10000, priceEurCents: 9000, name: 'Right Palm Inner Top' },
  16: { priceUsdCents: 10000, priceEurCents: 9000, name: 'Right Palm Inner Bottom' },
  17: { priceUsdCents: 10000, priceEurCents: 9000, name: 'Right Palm Outer Top' },
  18: { priceUsdCents: 10000, priceEurCents: 9000, name: 'Right Palm Outer Bottom' },
  19: { priceUsdCents: 15000, priceEurCents: 13800, name: '140W Fast Charger Body' },
  20: { priceUsdCents: 9900, priceEurCents: 9000, name: 'Magic Mouse Curved Top' }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const body = await req.json();

    const {
      orderType,
      spotId,
      tierId,
      customAmountCents,
      currency = 'usd',
      sponsorName,
      sponsorUrl,
      sponsorEmail,
      logoUrl,
      successUrl,
      cancelUrl
    } = body;

    // Validation
    if (!sponsorName?.trim()) {
      return new Response(JSON.stringify({ error: 'Sponsor name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!sponsorEmail?.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine canonical price
    let amountCents = 0;
    let title = 'Fund My Mac Sponsorship';

    if (orderType === 'spot_sponsorship') {
      const spot = CANONICAL_SPOTS[Number(spotId)];
      if (!spot) {
        return new Response(JSON.stringify({ error: 'Invalid spotId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      amountCents = currency === 'eur' ? spot.priceEurCents : spot.priceUsdCents;
      title = `MacBook Pro Sticker Spot #${spotId} (${spot.name})`;
    } else if (orderType === 'custom_donation') {
      amountCents = Math.max(500, Number(customAmountCents) || 500);
      title = 'Fund My Mac & VESPER Campaign Pledge';
    } else {
      amountCents = 10000;
      title = `Sponsorship Tier: ${tierId || 'Supporter'}`;
    }

    const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Atomically reserve spot
    if (orderType === 'spot_sponsorship' && spotId) {
      const { data: reserveRes, error: reserveErr } = await supabaseClient.rpc('atomic_reserve_spot', {
        p_spot_id: Number(spotId),
        p_session_id: sessionId,
        p_hold_seconds: 900
      });

      if (reserveErr || !reserveRes?.success) {
        return new Response(
          JSON.stringify({ error: reserveRes?.error || reserveErr?.message || 'Spot reservation failed' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!stripeKey) {
      // Safe Sandbox Test Mode
      await supabaseClient.from('sponsorship_orders').insert({
        provider_session_id: sessionId,
        order_type: orderType,
        spot_id: spotId ? Number(spotId) : null,
        tier_id: tierId || null,
        amount_cents: amountCents,
        currency,
        status: 'reserved',
        sponsor_name: sponsorName.trim(),
        sponsor_url: sponsorUrl?.trim() || null,
        sponsor_email: sponsorEmail.trim(),
        logo_url: logoUrl || null,
        payment_provider: 'test'
      });

      return new Response(
        JSON.stringify({
          success: true,
          isTestMode: true,
          sessionId,
          amountCents,
          currency,
          checkoutUrl: `${successUrl}?session_id=${sessionId}&status=test_sandbox`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Live Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: sponsorEmail.trim(),
      client_reference_id: sessionId,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: { name: title }
          },
          quantity: 1
        }
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${cancelUrl}?session_id={CHECKOUT_SESSION_ID}&status=cancelled`
    });

    await supabaseClient.from('sponsorship_orders').insert({
      provider_session_id: session.id,
      order_type: orderType,
      spot_id: spotId ? Number(spotId) : null,
      tier_id: tierId || null,
      amount_cents: amountCents,
      currency,
      status: 'reserved',
      sponsor_name: sponsorName.trim(),
      sponsor_url: sponsorUrl?.trim() || null,
      sponsor_email: sponsorEmail.trim(),
      logo_url: logoUrl || null,
      payment_provider: 'stripe'
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        amountCents,
        currency
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Checkout session error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
