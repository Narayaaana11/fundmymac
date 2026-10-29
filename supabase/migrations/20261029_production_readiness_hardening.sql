-- =========================================================================
-- Fund My Mac / VESPER Campaign: Production Hardening & Refund/Reconciliation Migration
-- Migration: 20261029_production_readiness_hardening.sql
-- =========================================================================

-- 1. Extend sponsorship_orders status constraint to support 'refunded'
ALTER TABLE public.sponsorship_orders
DROP CONSTRAINT IF EXISTS sponsorship_orders_status_check;

ALTER TABLE public.sponsorship_orders
ADD CONSTRAINT sponsorship_orders_status_check
CHECK (status IN ('pending', 'reserved', 'paid', 'failed', 'cancelled', 'expired', 'refunded'));

-- 2. Procedure: Automated Expired Reservation Sweep & Spot Lock
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
    -- Sweep any expired reservations across all spots first
    PERFORM public.release_expired_reservations();

    -- Acquire exclusive row lock on requested spot
    SELECT * INTO v_spot
    FROM public.brand_spots
    WHERE id = p_spot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Spot not found');
    END IF;

    -- Reject if permanently sold
    IF v_spot.status = 'sold' OR v_spot.is_sold THEN
        RETURN jsonb_build_object('success', false, 'error', 'Spot has already been sold');
    END IF;

    -- Reject if actively held by another concurrent checkout session
    IF v_spot.status = 'reserved' AND v_spot.reserved_until > v_now AND v_spot.reserved_by_session_id <> p_session_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Spot is currently held in checkout by another backer',
            'expires_at', v_spot.reserved_until
        );
    END IF;

    -- Grant reservation lock
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

-- 3. Procedure: Trusted Refund & Inventory Release Workflow
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
    -- Acquire exclusive row lock on order
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

    -- Record immutable audit log entry for refund
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

    -- Mark order as refunded
    UPDATE public.sponsorship_orders
    SET status = 'refunded',
        updated_at = v_now
    WHERE id = v_order.id;

    -- If this was a spot sponsorship, release the spot back to inventory
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

    -- Recalculate campaign totals strictly from confirmed paid orders
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

-- 4. Procedure: Operator Reconciliation of Captured Payment
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

    -- Execute payment confirmation
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

-- 5. Revoke anonymous execution rights and grant strictly to service_role
REVOKE EXECUTE ON FUNCTION public.process_order_refund(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reconcile_unclaimed_payment(TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.process_order_refund(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_unclaimed_payment(TEXT, TEXT) TO service_role;
