-- =========================================================================
-- Fund My Mac / VESPER Campaign: Razorpay Production Migration
-- Migration: 20261029_razorpay_integration.sql
-- =========================================================================

-- 1. Extend site_stats with INR total support
ALTER TABLE public.site_stats 
ADD COLUMN IF NOT EXISTS total_raised_inr_paise BIGINT NOT NULL DEFAULT 0;

-- 2. Extend brand_spots with canonical INR pricing
ALTER TABLE public.brand_spots 
ADD COLUMN IF NOT EXISTS price_inr_paise INT NOT NULL DEFAULT 850000;

-- Update canonical INR prices for all 20 spots
UPDATE public.brand_spots SET price_inr_paise = 2100000 WHERE id IN (1, 3);
UPDATE public.brand_spots SET price_inr_paise = 4200000 WHERE id = 2;
UPDATE public.brand_spots SET price_inr_paise = 850000  WHERE id IN (4, 5, 11, 12, 13, 14, 15, 16, 17, 18);
UPDATE public.brand_spots SET price_inr_paise = 1500000 WHERE id IN (6, 7);
UPDATE public.brand_spots SET price_inr_paise = 1250000 WHERE id IN (8, 9, 19);
UPDATE public.brand_spots SET price_inr_paise = 1900000 WHERE id = 10;
UPDATE public.brand_spots SET price_inr_paise = 800000  WHERE id = 20;

-- 3. Extend sponsorship_orders with Razorpay provider fields
ALTER TABLE public.sponsorship_orders
ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
ADD COLUMN IF NOT EXISTS provider_signature TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsorship_orders_provider_order_id 
ON public.sponsorship_orders(provider_order_id) 
WHERE provider_order_id IS NOT NULL;

-- Relax / update currency check to explicitly support INR along with USD & EUR
ALTER TABLE public.sponsorship_orders 
DROP CONSTRAINT IF EXISTS sponsorship_orders_currency_check;

ALTER TABLE public.sponsorship_orders 
ADD CONSTRAINT sponsorship_orders_currency_check 
CHECK (currency IN ('inr', 'usd', 'eur'));

-- Set default payment provider to razorpay
ALTER TABLE public.sponsorship_orders 
ALTER COLUMN payment_provider SET DEFAULT 'razorpay';

ALTER TABLE public.payment_transactions 
ALTER COLUMN provider SET DEFAULT 'razorpay';

-- 4. Update Public Sponsors View (Never exposes email or secrets)
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

-- 5. Harden atomic_reserve_spot function with search_path = public
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
    SELECT * INTO v_spot
    FROM public.brand_spots
    WHERE id = p_spot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Spot not found');
    END IF;

    IF v_spot.status = 'sold' OR v_spot.is_sold THEN
        RETURN jsonb_build_object('success', false, 'error', 'Spot has already been sold');
    END IF;

    IF v_spot.status = 'reserved' AND v_spot.reserved_until > v_now AND v_spot.reserved_by_session_id <> p_session_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Spot is currently held in checkout by another backer',
            'expires_at', v_spot.reserved_until
        );
    END IF;

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

-- 6. Harden release_expired_reservations function with search_path = public
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

-- 7. Harden confirm_paid_order function for Razorpay & INR calculations
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

    -- Lookup order by provider_order_id, provider_session_id, or id
    SELECT * INTO v_order
    FROM public.sponsorship_orders
    WHERE provider_order_id = p_provider_session_id 
       OR provider_session_id = p_provider_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found for provider reference');
    END IF;

    -- Insert into immutable transaction audit log
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

    -- If spot sponsorship, permanently claim the spot
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

    -- Compute campaign financial totals strictly from confirmed paid orders
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

-- 8. Harden record_real_pageview function
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

-- 9. Restricted Authorization Boundaries & Permissions
-- Revoke all execution rights from public and anonymous roles
REVOKE EXECUTE ON FUNCTION public.atomic_reserve_spot(INT, TEXT, INT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_paid_order(TEXT, TEXT, TEXT, INT, TEXT, JSONB) FROM PUBLIC, anon;

-- Grant execution strictly to service_role
GRANT EXECUTE ON FUNCTION public.atomic_reserve_spot(INT, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_paid_order(TEXT, TEXT, TEXT, INT, TEXT, JSONB) TO service_role;

-- Allow anon to record pageviews
GRANT EXECUTE ON FUNCTION public.record_real_pageview() TO anon, authenticated;
