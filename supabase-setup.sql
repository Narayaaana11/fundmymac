-- =========================================================================
-- Fund My Mac / Brand My Mac Realtime Database Schema (Supabase SQL Editor)
-- Copy and run this in: https://supabase.com/dashboard/project/lavydeusonwqjrlhtqzv/sql/new
-- Production Hardened: RLS Secured, Atomic Reservation, Razorpay Webhook Idempotency
-- =========================================================================

-- Enable pgcrypto for UUID generation if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create or Upgrade site_stats (Strictly Real Analytics)
CREATE TABLE IF NOT EXISTS public.site_stats (
    id INT PRIMARY KEY DEFAULT 1,
    views BIGINT NOT NULL DEFAULT 0,
    x_views_milestone BIGINT NOT NULL DEFAULT 0,
    spots_sold INT NOT NULL DEFAULT 0,
    total_raised_inr_paise BIGINT NOT NULL DEFAULT 0,
    total_raised_usd_cents BIGINT NOT NULL DEFAULT 0,
    total_raised_eur_cents BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- Initialize site_stats row if not present
INSERT INTO public.site_stats (id, views, x_views_milestone, spots_sold, total_raised_inr_paise, total_raised_usd_cents, total_raised_eur_cents)
VALUES (1, 0, 0, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- 2. Create or Upgrade brand_spots (Inventory)
CREATE TABLE IF NOT EXISTS public.brand_spots (
    id INT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'standard',
    view_type TEXT NOT NULL DEFAULT 'lid',       -- 'lid' | 'inside' | 'accessory'
    surface TEXT NOT NULL DEFAULT 'lid',         -- 'lid' | 'inside' | 'accessory'
    size TEXT NOT NULL DEFAULT 'Medium',         -- 'Small' | 'Medium' | 'Large'
    dimensions TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    price_inr_paise INT NOT NULL DEFAULT 850000,
    price_usd_cents INT NOT NULL DEFAULT 10000,
    price_eur_cents INT NOT NULL DEFAULT 9000,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
    is_sold BOOLEAN NOT NULL DEFAULT false,
    sponsor_name TEXT,
    sponsor_url TEXT,
    logo_url TEXT,
    reserved_until TIMESTAMPTZ,
    reserved_by_session_id TEXT,
    order_id UUID,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed canonical 20 spots if not already present
INSERT INTO public.brand_spots (id, name, category, view_type, surface, size, dimensions, location, price_inr_paise, price_usd_cents, price_eur_cents)
VALUES
(1, 'Spot #1 (Top-Left Banner)', 'standard', 'lid', 'lid', 'Large', '9.5 × 5.5 cm', 'Top left exterior lid', 2100000, 25000, 23000),
(2, 'Spot #2 (Marquee — Above Apple Logo)', 'marquee', 'lid', 'lid', 'Large', '9.5 × 5.5 cm', 'Prime center position above Apple logo', 4200000, 50000, 46000),
(3, 'Spot #3 (Top-Right Banner)', 'standard', 'lid', 'lid', 'Large', '9.5 × 5.5 cm', 'Top right exterior lid', 2100000, 25000, 23000),
(4, 'Spot #4 (Upper Left Mini-Strip)', 'standard', 'lid', 'lid', 'Small', '4.75 × 3 cm', 'Upper left corner', 850000, 10000, 9000),
(5, 'Spot #5 (Upper Right Mini-Strip)', 'standard', 'lid', 'lid', 'Small', '4.75 × 3 cm', 'Upper right corner', 850000, 10000, 9000),
(6, 'Spot #6 (Mid Left Flank)', 'standard', 'lid', 'lid', 'Medium', '6.5 × 4 cm', 'Mid-level left side', 1500000, 17500, 16000),
(7, 'Spot #7 (Mid Right Flank)', 'standard', 'lid', 'lid', 'Medium', '6.5 × 4 cm', 'Mid-level right side', 1500000, 17500, 16000),
(8, 'Spot #8 (Apple Left Adjacent)', 'apple_adjacent', 'lid', 'lid', 'Small', '4.75 × 3 cm', 'Immediately left of Apple logo', 1250000, 15000, 13800),
(9, 'Spot #9 (Apple Right Adjacent)', 'apple_adjacent', 'lid', 'lid', 'Small', '4.75 × 3 cm', 'Immediately right of Apple logo', 1250000, 15000, 13800),
(10, 'Spot #10 (Lower Deck Center)', 'standard', 'lid', 'lid', 'Large', '9.5 × 4.5 cm', 'Center bottom beneath Apple logo', 1900000, 22500, 21000),
(11, 'Spot #11 (Left Palm Outer Top)', 'inside_standard', 'inside', 'inside', 'Medium', '5.5 × 3.5 cm', 'Left Palm Rest — Outer Top', 850000, 10000, 9000),
(12, 'Spot #12 (Left Palm Outer Bottom)', 'inside_standard', 'inside', 'inside', 'Medium', '5.5 × 3.5 cm', 'Left Palm Rest — Outer Bottom', 850000, 10000, 9000),
(13, 'Spot #13 (Left Palm Inner Top)', 'inside_standard', 'inside', 'inside', 'Medium', '5.5 × 3.5 cm', 'Left Palm Rest — Inner Top', 850000, 10000, 9000),
(14, 'Spot #14 (Left Palm Inner Bottom)', 'inside_standard', 'inside', 'inside', 'Medium', '5.5 × 3.5 cm', 'Left Palm Rest — Inner Bottom', 850000, 10000, 9000),
(15, 'Spot #15 (Right Palm Inner Top)', 'inside_standard', 'inside', 'inside', 'Medium', '5.5 × 3.5 cm', 'Right Palm Rest — Inner Top', 850000, 10000, 9000),
(16, 'Spot #16 (Right Palm Inner Bottom)', 'inside_standard', 'inside', 'inside', 'Medium', '5.5 × 3.5 cm', 'Right Palm Rest — Inner Bottom', 850000, 10000, 9000),
(17, 'Spot #17 (Right Palm Outer Top)', 'inside_standard', 'inside', 'inside', 'Medium', '5.5 × 3.5 cm', 'Right Palm Rest — Outer Top', 850000, 10000, 9000),
(18, 'Spot #18 (Right Palm Outer Bottom)', 'inside_standard', 'inside', 'inside', 'Medium', '5.5 × 3.5 cm', 'Right Palm Rest — Outer Bottom', 850000, 10000, 9000),
(19, 'Spot #19 (140W Fast Charger Body)', 'accessory', 'accessory', 'accessory', 'Large', '7 × 7 cm', 'Apple 140W GaN Fast Power Adapter Body', 1250000, 15000, 13800),
(20, 'Spot #20 (Magic Mouse Curved Top)', 'accessory', 'accessory', 'accessory', 'Medium', '5.5 × 3.5 cm', 'Apple Magic Mouse Curved Top Shell', 800000, 9900, 9000)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    view_type = EXCLUDED.view_type,
    surface = EXCLUDED.surface,
    size = EXCLUDED.size,
    dimensions = EXCLUDED.dimensions,
    location = EXCLUDED.location,
    price_inr_paise = EXCLUDED.price_inr_paise,
    price_usd_cents = EXCLUDED.price_usd_cents,
    price_eur_cents = EXCLUDED.price_eur_cents;

-- 3. Create Orders Table (Contains Sensitive PII - Never Public!)
CREATE TABLE IF NOT EXISTS public.sponsorship_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_type TEXT NOT NULL CHECK (order_type IN ('spot_sponsorship', 'tier_sponsorship', 'custom_donation')),
    spot_id INT REFERENCES public.brand_spots(id),
    tier_id TEXT,
    amount_cents INT NOT NULL CHECK (amount_cents > 0),
    currency TEXT NOT NULL CHECK (currency IN ('inr', 'usd', 'eur')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reserved', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
    sponsor_name TEXT NOT NULL,
    sponsor_url TEXT,
    sponsor_email TEXT NOT NULL,
    logo_url TEXT,
    payment_provider TEXT NOT NULL DEFAULT 'razorpay',
    provider_order_id TEXT UNIQUE,
    provider_session_id TEXT UNIQUE,
    provider_payment_id TEXT,
    provider_payment_intent_id TEXT,
    provider_signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 4. Create Payment Transactions Audit Log (Contains Immutable Ledger & Idempotency)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sponsorship_orders(id) ON DELETE RESTRICT,
    provider TEXT NOT NULL DEFAULT 'razorpay',
    provider_event_id TEXT NOT NULL UNIQUE, -- Prevents duplicate webhook execution!
    event_type TEXT NOT NULL,
    amount_cents INT NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create Public Safe Sponsors View (Sanitized, NO Private Email Exposure)
CREATE OR REPLACE VIEW public.public_sponsors_wall AS
SELECT
    so.id AS order_id,
    so.order_type,
    so.spot_id,
    so.tier_id,
    so.sponsor_name,
    so.sponsor_url,
    so.logo_url,
    so.amount_cents,
    so.currency,
    so.paid_at
FROM public.sponsorship_orders so
WHERE so.status = 'paid'
ORDER BY so.paid_at DESC;

-- 6. Enable Row Level Security (RLS) on ALL Tables
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 7. Drop Unsafe Legacy Policies
DROP POLICY IF EXISTS "Allow public update on brand_spots" ON public.brand_spots;
DROP POLICY IF EXISTS "Allow public read on brand_spots" ON public.brand_spots;
DROP POLICY IF EXISTS "Allow public read on site_stats" ON public.site_stats;
DROP POLICY IF EXISTS "Allow public read on donations" ON public.donations;
DROP POLICY IF EXISTS "Allow public insert on donations" ON public.donations;

-- 8. Apply Strict, Least-Privilege RLS Policies
-- site_stats: Public SELECT only
CREATE POLICY "Public read site_stats"
ON public.site_stats FOR SELECT TO anon, authenticated
USING (true);

-- brand_spots: Public SELECT only. NO ANONYMOUS UPDATES / INSERTS!
CREATE POLICY "Public read brand_spots"
ON public.brand_spots FOR SELECT TO anon, authenticated
USING (true);

-- sponsorship_orders: Completely hidden from public anon role (PII Protected)
CREATE POLICY "Service role full access on sponsorship_orders"
ON public.sponsorship_orders TO service_role
USING (true) WITH CHECK (true);

-- payment_transactions: Completely hidden from public anon role
CREATE POLICY "Service role full access on payment_transactions"
ON public.payment_transactions TO service_role
USING (true) WITH CHECK (true);

-- 9. Atomic Spot Reservation Procedure (Concurrency Safe)
CREATE OR REPLACE FUNCTION public.atomic_reserve_spot(
    p_spot_id INT,
    p_session_id TEXT,
    p_hold_seconds INT DEFAULT 900
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_spot RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_expiry TIMESTAMPTZ;
BEGIN
    -- Acquire exclusive row lock
    SELECT * INTO v_spot
    FROM public.brand_spots
    WHERE id = p_spot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Spot not found');
    END IF;

    -- If already permanently sold, reject immediately
    IF v_spot.status = 'sold' OR v_spot.is_sold THEN
        RETURN jsonb_build_object('success', false, 'error', 'Spot has already been sold');
    END IF;

    -- If currently reserved by another active session, check expiry
    IF v_spot.status = 'reserved' AND v_spot.reserved_until > v_now AND v_spot.reserved_by_session_id <> p_session_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Spot is currently held in checkout by another backer',
            'expires_at', v_spot.reserved_until
        );
    END IF;

    -- Valid reservation: update lock
    v_expiry := v_now + (p_hold_seconds || ' seconds')::INTERVAL;
    UPDATE public.brand_spots
    SET status = 'reserved',
        reserved_until = v_expiry,
        reserved_by_session_id = p_session_id,
        updated_at = v_now
    WHERE id = p_spot_id;

    RETURN jsonb_build_object(
        'success', true,
        'spot_id', p_spot_id,
        'reserved_until', v_expiry
    );
END;
$$;

-- 10. Atomic Release of Expired Reservations Procedure
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_released_count INT;
BEGIN
    UPDATE public.brand_spots
    SET status = 'available',
        reserved_until = NULL,
        reserved_by_session_id = NULL,
        updated_at = NOW()
    WHERE status = 'reserved'
      AND reserved_until <= NOW();

    GET DIAGNOSTICS v_released_count = ROW_COUNT;
    RETURN v_released_count;
END;
$$;

-- 11. Idempotent Payment Confirmation Procedure
CREATE OR REPLACE FUNCTION public.confirm_paid_order(
    p_provider_event_id TEXT,
    p_provider_session_id TEXT,
    p_provider_payment_intent_id TEXT,
    p_amount_cents INT,
    p_currency TEXT,
    p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_spots_sold INT;
    v_total_inr BIGINT;
    v_total_usd BIGINT;
    v_total_eur BIGINT;
BEGIN
    -- Idempotency check: if this event was already processed, exit safely
    IF EXISTS (SELECT 1 FROM public.payment_transactions WHERE provider_event_id = p_provider_event_id) THEN
        RETURN jsonb_build_object('success', true, 'status', 'already_processed');
    END IF;

    -- Lookup order
    SELECT * INTO v_order
    FROM public.sponsorship_orders
    WHERE provider_order_id = p_provider_session_id 
       OR provider_session_id = p_provider_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found for provider reference');
    END IF;

    -- Record transaction in immutable audit ledger
    INSERT INTO public.payment_transactions (
        order_id,
        provider,
        provider_event_id,
        event_type,
        amount_cents,
        currency,
        status,
        raw_payload,
        created_at
    ) VALUES (
        v_order.id,
        'razorpay',
        p_provider_event_id,
        'payment_confirmed',
        p_amount_cents,
        p_currency,
        'paid',
        p_raw_payload,
        v_now
    );

    -- Mark order as paid
    UPDATE public.sponsorship_orders
    SET status = 'paid',
        provider_payment_id = p_provider_payment_intent_id,
        provider_payment_intent_id = p_provider_payment_intent_id,
        paid_at = v_now,
        updated_at = v_now
    WHERE id = v_order.id;

    -- If this is a spot sponsorship, permanently claim the spot
    IF v_order.spot_id IS NOT NULL THEN
        UPDATE public.brand_spots
        SET status = 'sold',
            is_sold = true,
            sponsor_name = v_order.sponsor_name,
            sponsor_url = v_order.sponsor_url,
            logo_url = v_order.logo_url,
            order_id = v_order.id,
            reserved_until = NULL,
            reserved_by_session_id = NULL,
            claimed_at = v_now,
            updated_at = v_now
        WHERE id = v_order.spot_id;
    END IF;

    -- Compute canonical financial totals strictly from paid orders
    SELECT COUNT(*) INTO v_spots_sold FROM public.brand_spots WHERE status = 'sold';
    SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_inr FROM public.sponsorship_orders WHERE status = 'paid' AND currency = 'inr';
    SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_usd FROM public.sponsorship_orders WHERE status = 'paid' AND currency = 'usd';
    SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_eur FROM public.sponsorship_orders WHERE status = 'paid' AND currency = 'eur';

    -- Update campaign stats
    UPDATE public.site_stats
    SET spots_sold = v_spots_sold,
        total_raised_inr_paise = v_total_inr,
        total_raised_usd_cents = v_total_usd,
        total_raised_eur_cents = v_total_eur,
        updated_at = v_now
    WHERE id = 1;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'spot_id', v_order.spot_id,
        'status', 'paid'
    );
END;
$$;

-- 12. Trusted Refund & Inventory Release Procedure
CREATE OR REPLACE FUNCTION public.process_order_refund(
    p_order_id UUID,
    p_refund_reason TEXT,
    p_refund_provider_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_spots_sold INT;
    v_total_inr BIGINT;
    v_total_usd BIGINT;
    v_total_eur BIGINT;
BEGIN
    SELECT * INTO v_order
    FROM public.sponsorship_orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    IF v_order.status <> 'paid' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only confirmed paid orders can be refunded. Current status: ' || v_order.status);
    END IF;

    INSERT INTO public.payment_transactions (
        order_id,
        provider,
        provider_event_id,
        event_type,
        amount_cents,
        currency,
        status,
        raw_payload,
        created_at
    ) VALUES (
        v_order.id,
        v_order.payment_provider,
        COALESCE(p_refund_provider_reference, 'ref_' || gen_random_uuid()),
        'payment_refunded',
        v_order.amount_cents,
        v_order.currency,
        'refunded',
        jsonb_build_object('reason', p_refund_reason, 'refunded_at', v_now),
        v_now
    );

    UPDATE public.sponsorship_orders
    SET status = 'refunded',
        updated_at = v_now
    WHERE id = v_order.id;

    IF v_order.spot_id IS NOT NULL THEN
        UPDATE public.brand_spots
        SET status = 'available',
            is_sold = false,
            sponsor_name = NULL,
            sponsor_url = NULL,
            logo_url = NULL,
            order_id = NULL,
            reserved_until = NULL,
            reserved_by_session_id = NULL,
            claimed_at = NULL,
            updated_at = v_now
        WHERE id = v_order.spot_id;
    END IF;

    SELECT COUNT(*) INTO v_spots_sold FROM public.brand_spots WHERE status = 'sold';
    SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_inr FROM public.sponsorship_orders WHERE status = 'paid' AND currency = 'inr';
    SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_usd FROM public.sponsorship_orders WHERE status = 'paid' AND currency = 'usd';
    SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_eur FROM public.sponsorship_orders WHERE status = 'paid' AND currency = 'eur';

    UPDATE public.site_stats
    SET spots_sold = v_spots_sold,
        total_raised_inr_paise = v_total_inr,
        total_raised_usd_cents = v_total_usd,
        total_raised_eur_cents = v_total_eur,
        updated_at = v_now
    WHERE id = 1;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'spot_id', v_order.spot_id,
        'status', 'refunded'
    );
END;
$$;

-- 13. Operator Payment Reconciliation Procedure
CREATE OR REPLACE FUNCTION public.reconcile_unclaimed_payment(
    p_provider_order_id TEXT,
    p_provider_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
BEGIN
    SELECT * INTO v_order
    FROM public.sponsorship_orders
    WHERE provider_order_id = p_provider_order_id 
       OR provider_session_id = p_provider_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No order matches provider reference');
    END IF;

    IF v_order.status = 'paid' THEN
        RETURN jsonb_build_object('success', true, 'status', 'already_paid', 'order_id', v_order.id);
    END IF;

    RETURN public.confirm_paid_order(
        p_provider_payment_id,
        p_provider_order_id,
        p_provider_payment_id,
        v_order.amount_cents,
        v_order.currency,
        jsonb_build_object('reconciled_manually', true, 'reconciled_at', NOW())
    );
END;
$$;

-- 14. Atomic Pageview Increment Function (Session-Gated on client)
CREATE OR REPLACE FUNCTION public.record_real_pageview()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_views BIGINT;
BEGIN
    UPDATE public.site_stats
    SET views = views + 1,
        updated_at = NOW()
    WHERE id = 1
    RETURNING views INTO new_views;

    RETURN new_views;
END;
$$;

-- 15. Grant explicit access to trusted functions
REVOKE EXECUTE ON FUNCTION public.atomic_reserve_spot(INT, TEXT, INT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_paid_order(TEXT, TEXT, TEXT, INT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_order_refund(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reconcile_unclaimed_payment(TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.atomic_reserve_spot(INT, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_paid_order(TEXT, TEXT, TEXT, INT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_order_refund(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_unclaimed_payment(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_real_pageview() TO anon, authenticated;

-- 14. Realtime Broadcast configuration for public tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'brand_spots'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_spots;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'site_stats'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.site_stats;
    END IF;
END $$;
