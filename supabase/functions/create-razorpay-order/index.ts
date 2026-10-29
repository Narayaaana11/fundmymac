// =========================================================================
// Supabase Edge Function: create-razorpay-order
// Deploy via: supabase functions deploy create-razorpay-order
// =========================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CANONICAL_SPOTS: Record<number, { priceInrPaise: number; priceUsdCents: number; priceEurCents: number; name: string }> = {
  1: { priceInrPaise: 2100000, priceUsdCents: 25000, priceEurCents: 23000, name: 'Top-Left Banner' },
  2: { priceInrPaise: 4200000, priceUsdCents: 50000, priceEurCents: 46000, name: 'Marquee — Above Apple Logo' },
  3: { priceInrPaise: 2100000, priceUsdCents: 25000, priceEurCents: 23000, name: 'Top-Right Banner' },
  4: { priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000, name: 'Upper Left Mini-Strip' },
  5: { priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000, name: 'Upper Right Mini-Strip' },
  6: { priceInrPaise: 1500000, priceUsdCents: 17500, priceEurCents: 16000, name: 'Mid Left Flank' },
  7: { priceInrPaise: 1500000, priceUsdCents: 17500, priceEurCents: 16000, name: 'Mid Right Flank' },
  8: { priceInrPaise: 1250000, priceUsdCents: 15000, priceEurCents: 13800, name: 'Apple Left Adjacent' },
  9: { priceInrPaise: 1250000, priceUsdCents: 15000, priceEurCents: 13800, name: 'Apple Right Adjacent' },
  10: { priceInrPaise: 1900000, priceUsdCents: 22500, priceEurCents: 21000, name: 'Lower Deck Center' },
  11: { priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000, name: 'Left Palm Outer Top' },
  12: { priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000, name: 'Left Palm Outer Bottom' },
  13: { priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000, name: 'Left Palm Inner Top' },
  14: { priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000, name: 'Left Palm Inner Bottom' },
  15: { priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000, name: 'Right Palm Inner Top' },
  16: { priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000, name: 'Right Palm Inner Bottom' },
  17: { priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000, name: 'Right Palm Outer Top' },
  18: { priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000, name: 'Right Palm Outer Bottom' },
  19: { priceInrPaise: 1250000, priceUsdCents: 15000, priceEurCents: 13800, name: '140W Fast Charger Body' },
  20: { priceInrPaise: 800000, priceUsdCents: 9900, priceEurCents: 9000, name: 'Magic Mouse Curved Top' }
};

const CANONICAL_TIERS: Record<string, { priceInrPaise: number; priceUsdCents: number; priceEurCents: number; name: string }> = {
  corner: { priceInrPaise: 600000, priceUsdCents: 7500, priceEurCents: 6900, name: 'The Corner Sponsor' },
  charger: { priceInrPaise: 1250000, priceUsdCents: 15000, priceEurCents: 13800, name: '140W Fast Charger Partner' },
  palm: { priceInrPaise: 1500000, priceUsdCents: 17500, priceEurCents: 16000, name: 'Dual Palm Rest Sponsor' },
  lid: { priceInrPaise: 2100000, priceUsdCents: 25000, priceEurCents: 23000, name: 'Exterior Lid Prime Sponsor' },
  title: { priceInrPaise: 4200000, priceUsdCents: 50000, priceEurCents: 46000, name: 'Marquee Title Partner' }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production' || Deno.env.get('NODE_ENV') === 'production';

    // 0. Server-Enforced Fail-Closed Launch Gate for Public Preview
    const isCheckoutEnabled = Deno.env.get('CHECKOUT_ENABLED') === 'true';
    if (!isCheckoutEnabled) {
      return new Response(JSON.stringify({
        success: false,
        previewMode: true,
        error: 'Sponsorship checkout is currently opening soon. Public preview is active; orders cannot be created at this time. Please join the waitlist.'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (isProduction && (!razorpayKeyId || !razorpayKeySecret)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Production payment configuration missing: Live Razorpay merchant credentials required.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();

    const {
      orderType,
      spotId,
      tierId,
      customAmountMinor,
      customAmountCents,
      currency = 'inr',
      sponsorName,
      sponsorUrl,
      sponsorEmail,
      logoUrl
    } = body;

    // 1. Validation
    if (!sponsorName || typeof sponsorName !== 'string' || sponsorName.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Sponsor name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!sponsorEmail || !emailRegex.test(sponsorEmail)) {
      return new Response(JSON.stringify({ success: false, error: 'Valid sponsor email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const cur = (currency || 'inr').toLowerCase();
    if (cur !== 'inr' && cur !== 'usd' && cur !== 'eur') {
      return new Response(JSON.stringify({ success: false, error: 'Supported currencies: INR, USD, EUR' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Canonical server pricing
    let canonicalAmountMinor = 0;
    if (orderType === 'spot_sponsorship') {
      const spot = CANONICAL_SPOTS[spotId];
      if (!spot) {
        return new Response(JSON.stringify({ success: false, error: `Invalid spot ID: ${spotId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      canonicalAmountMinor = cur === 'inr' ? spot.priceInrPaise : cur === 'eur' ? spot.priceEurCents : spot.priceUsdCents;
    } else if (orderType === 'tier_sponsorship') {
      const tier = CANONICAL_TIERS[tierId];
      if (!tier) {
        return new Response(JSON.stringify({ success: false, error: `Invalid tier ID: ${tierId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      canonicalAmountMinor = cur === 'inr' ? tier.priceInrPaise : cur === 'eur' ? tier.priceEurCents : tier.priceUsdCents;
    } else if (orderType === 'custom_donation') {
      const minDonation = cur === 'inr' ? 50000 : 500;
      const amt = customAmountMinor || customAmountCents || 0;
      if (amt < minDonation) {
        return new Response(JSON.stringify({ success: false, error: `Minimum contribution is ${cur === 'inr' ? '₹500' : '$5'}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      canonicalAmountMinor = amt;
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Invalid orderType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Generate internal order ID & reserve spot atomically
    const internalOrderId = `ord_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    if (orderType === 'spot_sponsorship' && spotId) {
      const { data: reserveData, error: reserveError } = await supabaseClient.rpc('atomic_reserve_spot', {
        p_spot_id: spotId,
        p_session_id: internalOrderId,
        p_hold_seconds: 900
      });

      if (reserveError || !reserveData?.success) {
        return new Response(JSON.stringify({
          success: false,
          error: reserveData?.error || reserveError?.message || 'Spot reservation failed'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 4. Create Razorpay Order (Strict Fail-Closed)
    if (!razorpayKeyId || !razorpayKeySecret) {
      if (orderType === 'spot_sponsorship' && spotId) {
        await supabaseClient.from('brand_spots')
          .update({ status: 'available', reserved_until: null, reserved_by_session_id: null })
          .eq('id', spotId)
          .eq('reserved_by_session_id', internalOrderId);
      }
      return new Response(JSON.stringify({
        success: false,
        error: 'Payment gateway configuration missing: Valid Razorpay merchant credentials required.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: canonicalAmountMinor,
        currency: cur.toUpperCase(),
        receipt: internalOrderId,
        notes: {
          orderType,
          spotId: spotId ? String(spotId) : '',
          tierId: tierId || '',
          sponsorName: sponsorName.trim(),
          sponsorEmail: sponsorEmail.trim()
        }
      })
    });

    if (!rzpResponse.ok) {
      // Release spot on failure
      if (orderType === 'spot_sponsorship' && spotId) {
        await supabaseClient.from('brand_spots')
          .update({ status: 'available', reserved_until: null, reserved_by_session_id: null })
          .eq('id', spotId)
          .eq('reserved_by_session_id', internalOrderId);
      }
      const errText = await rzpResponse.text();
      return new Response(JSON.stringify({ success: false, error: `Razorpay Orders API error: ${errText}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const rzpOrder = await rzpResponse.json();

    // Persist pending order
    await supabaseClient.from('sponsorship_orders').insert({
      provider_session_id: rzpOrder.id,
      provider_order_id: rzpOrder.id,
      order_type: orderType,
      spot_id: spotId || null,
      tier_id: tierId || null,
      amount_cents: canonicalAmountMinor,
      currency: cur,
      status: 'reserved',
      sponsor_name: sponsorName.trim(),
      sponsor_url: sponsorUrl || null,
      sponsor_email: sponsorEmail.trim(),
      logo_url: logoUrl || null,
      payment_provider: 'razorpay'
    });

    return new Response(JSON.stringify({
      success: true,
      orderId: internalOrderId,
      razorpayOrderId: rzpOrder.id,
      amountMinor: canonicalAmountMinor,
      currency: cur,
      keyId: razorpayKeyId,
      isTestMode: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Edge function error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
