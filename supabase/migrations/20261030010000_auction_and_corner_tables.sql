-- =========================================================================
-- FUND MY MAC: BRANDMYMAC AUCTION & CORNER TAKEOVER SCHEMA
-- Migration: 20261030010000_auction_and_corner_tables.sql
-- =========================================================================

-- 1. Ensure bid_count column exists on brand_spots
ALTER TABLE public.brand_spots
  ADD COLUMN IF NOT EXISTS bid_count INTEGER NOT NULL DEFAULT 0;

-- 2. Create bids table to track live auction bids & 20% deposits
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id INTEGER NOT NULL REFERENCES public.brand_spots(id) ON DELETE CASCADE,
  bidder_name TEXT NOT NULL,
  bidder_email TEXT NOT NULL,
  bidder_url TEXT NOT NULL,
  logo_url TEXT,
  bid_amount_usd_cents INTEGER NOT NULL CHECK (bid_amount_usd_cents > 0),
  deposit_amount_cents INTEGER NOT NULL CHECK (deposit_amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'eur', 'inr')),
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'outbid', 'won', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast queries by spot and status
CREATE INDEX IF NOT EXISTS idx_bids_spot_status ON public.bids(spot_id, status);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON public.bids(created_at DESC);

-- Enable RLS
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Transparent read access for public auction verification (emails hidden via view if needed)
CREATE POLICY "Public can view bids"
  ON public.bids
  FOR SELECT
  USING (true);

-- 3. Create corner_sponsors table for dynamic website takeover
CREATE TABLE IF NOT EXISTS public.corner_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  avatar_url TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'eur', 'inr')),
  is_current BOOLEAN NOT NULL DEFAULT true,
  held_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  held_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corner_is_current ON public.corner_sponsors(is_current);

-- Enable RLS
ALTER TABLE public.corner_sponsors ENABLE ROW LEVEL SECURITY;

-- Public can view current and historical corner sponsors
CREATE POLICY "Public can view corner sponsors"
  ON public.corner_sponsors
  FOR SELECT
  USING (true);

-- 4. Function to place a bid and update spot top bid atomically
CREATE OR REPLACE FUNCTION public.place_auction_bid(
  p_spot_id INTEGER,
  p_bidder_name TEXT,
  p_bidder_email TEXT,
  p_bidder_url TEXT,
  p_logo_url TEXT,
  p_bid_amount_cents INTEGER,
  p_deposit_cents INTEGER,
  p_currency TEXT,
  p_payment_id TEXT,
  p_order_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spot RECORD;
  v_new_bid_id UUID;
  v_prev_bid RECORD;
BEGIN
  -- Lock spot row for update
  SELECT * INTO v_spot
  FROM public.brand_spots
  WHERE id = p_spot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spot not found');
  END IF;

  -- Ensure new bid exceeds current top bid
  IF v_spot.price_usd_cents IS NOT NULL AND p_bid_amount_cents <= v_spot.price_usd_cents THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bid must be higher than current top bid');
  END IF;

  -- Find and mark previous active bid as outbid
  FOR v_prev_bid IN
    SELECT * FROM public.bids
    WHERE spot_id = p_spot_id AND status = 'active'
    FOR UPDATE
  LOOP
    UPDATE public.bids
    SET status = 'outbid', updated_at = now()
    WHERE id = v_prev_bid.id;
  END LOOP;

  -- Insert new winning bid
  INSERT INTO public.bids (
    spot_id, bidder_name, bidder_email, bidder_url, logo_url,
    bid_amount_usd_cents, deposit_amount_cents, currency,
    razorpay_payment_id, razorpay_order_id, status
  ) VALUES (
    p_spot_id, p_bidder_name, p_bidder_email, p_bidder_url, p_logo_url,
    p_bid_amount_cents, p_deposit_cents, p_currency,
    p_payment_id, p_order_id, 'active'
  ) RETURNING id INTO v_new_bid_id;

  -- Update spot top bid and increment bid count
  UPDATE public.brand_spots
  SET
    price_usd_cents = p_bid_amount_cents,
    sponsor_name = p_bidder_name,
    sponsor_url = p_bidder_url,
    logo_url = COALESCE(p_logo_url, logo_url),
    bid_count = COALESCE(bid_count, 0) + 1,
    updated_at = now()
  WHERE id = p_spot_id;

  RETURN jsonb_build_object(
    'success', true,
    'bid_id', v_new_bid_id,
    'new_top_bid_cents', p_bid_amount_cents
  );
END;
$$;
