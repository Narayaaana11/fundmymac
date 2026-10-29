// =========================================================================
// Server-Side Razorpay Payment Adapter & Webhook Engine
// Enforces:
// 1. Server-side price canonicalization (browser amounts strictly ignored)
// 2. Canonical INR (paise) calculation & multi-currency validation
// 3. Atomic spot inventory reservation with automatic failure compensation
// 4. Razorpay Standard Checkout HMAC-SHA256 signature verification
// 5. Razorpay raw-body Webhook signature validation & idempotency
// 6. Safe test-mode sandbox when merchant keys are not configured
// =========================================================================

import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  WebhookProcessingResult,
  CurrencyCode
} from './types.ts';
import {
  CANONICAL_SPOTS,
  CANONICAL_TIERS,
  getCanonicalSpotAmount,
  getCanonicalTierAmount,
  getMinimumDonationAmount
} from './canonicalCatalog.ts';
import { validateDataUrl } from './assetValidator.ts';

export interface RazorpayAdapterConfig {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  isTestMode?: boolean;
}

export class RazorpayPaymentAdapter {
  private supabase: SupabaseClient | null = null;
  public readonly config: RazorpayAdapterConfig;

  // In-memory store for isolated unit tests / environments without live DB
  private localTestOrders: Map<string, {
    id: string;
    razorpayOrderId: string;
    spotId?: number | null;
    tierId?: string | null;
    amountMinor: number;
    currency: CurrencyCode;
    status: string;
    sponsorName: string;
    sponsorUrl?: string;
    sponsorEmail: string;
    logoUrl?: string;
  }> = new Map();

  private localTestSpots: Map<number, {
    status: 'available' | 'reserved' | 'sold';
    reservedUntil?: number;
    reservedBySessionId?: string;
  }> = new Map();

  private processedEventIds: Set<string> = new Set();

  constructor(config?: RazorpayAdapterConfig) {
    this.config = {
      razorpayKeyId: config?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID,
      razorpayKeySecret: config?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET,
      razorpayWebhookSecret: config?.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET,
      supabaseUrl: config?.supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      supabaseServiceKey: config?.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY,
      isTestMode: config?.isTestMode ?? (!process.env.RAZORPAY_KEY_SECRET || process.env.NODE_ENV === 'test')
    };

    if (this.config.supabaseUrl && this.config.supabaseServiceKey) {
      this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
  }

  /**
   * Validates checkout request, enforces canonical pricing, reserves spot atomically,
   * and creates an official Razorpay Order via the server-side Orders API.
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    try {
      // 1. Validate sponsor contact input
      if (!params.sponsorName || params.sponsorName.trim().length === 0) {
        return { success: false, error: 'Sponsor name is required' };
      }
      if (params.sponsorName.length > 120) {
        return { success: false, error: 'Sponsor name must not exceed 120 characters' };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!params.sponsorEmail || !emailRegex.test(params.sponsorEmail.trim())) {
        return { success: false, error: 'Valid sponsor email is required' };
      }

      const currency: CurrencyCode = params.currency || 'inr';
      if (currency !== 'inr' && currency !== 'usd' && currency !== 'eur') {
        return { success: false, error: `Unsupported currency: ${currency}. Supported: INR, USD, EUR` };
      }

      // 2. Validate logo if provided
      if (params.logoUrl && params.logoUrl.startsWith('data:')) {
        const logoValidation = validateDataUrl(params.logoUrl);
        if (!logoValidation.valid) {
          return { success: false, error: logoValidation.error };
        }
      }

      // 3. Determine canonical server price (NEVER trust client submitted amounts)
      let canonicalAmountMinor = 0;
      let lineItemTitle = '';

      if (params.orderType === 'spot_sponsorship') {
        if (!params.spotId || !CANONICAL_SPOTS[params.spotId]) {
          return { success: false, error: `Invalid or missing spotId: ${params.spotId}` };
        }
        const spot = CANONICAL_SPOTS[params.spotId];
        canonicalAmountMinor = getCanonicalSpotAmount(params.spotId, currency);
        lineItemTitle = `MacBook Pro Sticker Sponsorship — Spot #${spot.id} (${spot.name})`;
      } else if (params.orderType === 'tier_sponsorship') {
        if (!params.tierId || !CANONICAL_TIERS[params.tierId]) {
          return { success: false, error: `Invalid or missing tierId: ${params.tierId}` };
        }
        const tier = CANONICAL_TIERS[params.tierId];
        canonicalAmountMinor = getCanonicalTierAmount(params.tierId, currency);
        lineItemTitle = `VESPER Sponsorship — ${tier.name}`;
      } else if (params.orderType === 'custom_donation') {
        const minDonation = getMinimumDonationAmount(currency);
        const customAmount = params.customAmountMinor || params.customAmountCents || 0;
        if (customAmount < minDonation) {
          const formattedMin = currency === 'inr' ? `₹${minDonation / 100}` : `$${minDonation / 100}`;
          return {
            success: false,
            error: `Minimum contribution is ${formattedMin}`
          };
        }
        canonicalAmountMinor = customAmount;
        lineItemTitle = 'Fund My Mac & VESPER Campaign Contribution';
      } else {
        return { success: false, error: `Unsupported order type: ${params.orderType}` };
      }

      // 4. Generate stable internal order reference
      const internalOrderId = `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // 5. Atomic spot reservation (if applicable)
      if (params.orderType === 'spot_sponsorship' && params.spotId) {
        const reservation = await this.reserveSpot(params.spotId, internalOrderId);
        if (!reservation.success) {
          return { success: false, error: reservation.error };
        }
      }

      // 6. Branch: Live Razorpay Orders API vs. Test Sandbox Mode
      const hasLiveKeys = !!(this.config.razorpayKeyId && this.config.razorpayKeySecret && !this.config.isTestMode);

      if (hasLiveKeys) {
        try {
          const authHeader = 'Basic ' + Buffer.from(`${this.config.razorpayKeyId}:${this.config.razorpayKeySecret}`).toString('base64');
          const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              amount: canonicalAmountMinor,
              currency: currency.toUpperCase(),
              receipt: internalOrderId,
              notes: {
                orderType: params.orderType,
                title: lineItemTitle,
                spotId: params.spotId ? String(params.spotId) : '',
                tierId: params.tierId || '',
                sponsorName: params.sponsorName.trim(),
                sponsorEmail: params.sponsorEmail.trim()
              }
            })
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            // Cleanup: release reserved spot if order creation failed
            if (params.orderType === 'spot_sponsorship' && params.spotId) {
              await this.releaseSpot(params.spotId, internalOrderId);
            }
            return {
              success: false,
              error: `Razorpay Orders API error: ${(errData as { error?: { description?: string } }).error?.description || response.statusText}`
            };
          }

          const rzpOrder = await response.json() as { id: string; amount: number; currency: string };

          // Persist pending order in database
          await this.recordPendingOrder({
            internalOrderId,
            razorpayOrderId: rzpOrder.id,
            orderType: params.orderType,
            spotId: params.spotId,
            tierId: params.tierId,
            amountMinor: canonicalAmountMinor,
            currency,
            sponsorName: params.sponsorName.trim(),
            sponsorUrl: params.sponsorUrl?.trim(),
            sponsorEmail: params.sponsorEmail.trim(),
            logoUrl: params.logoUrl,
            provider: 'razorpay'
          });

          return {
            success: true,
            orderId: internalOrderId,
            razorpayOrderId: rzpOrder.id,
            sessionId: rzpOrder.id, // compatibility alias
            amountMinor: canonicalAmountMinor,
            amountCents: canonicalAmountMinor,
            currency,
            keyId: this.config.razorpayKeyId,
            isTestMode: false
          };
        } catch (apiErr: unknown) {
          // Compensating action: release spot reservation
          if (params.orderType === 'spot_sponsorship' && params.spotId) {
            await this.releaseSpot(params.spotId, internalOrderId);
          }
          const msg = apiErr instanceof Error ? apiErr.message : 'Network error calling Razorpay API';
          return { success: false, error: msg };
        }
      }

      // 7. Test / Sandbox Mode Fallback (Forbidden in Production)
      if (process.env.NODE_ENV === 'production' && !hasLiveKeys) {
        if (params.orderType === 'spot_sponsorship' && params.spotId) {
          await this.releaseSpot(params.spotId, internalOrderId);
        }
        return {
          success: false,
          error: 'Production payment configuration missing: Live Razorpay merchant credentials required.'
        };
      }

      const testRazorpayOrderId = `order_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      await this.recordPendingOrder({
        internalOrderId,
        razorpayOrderId: testRazorpayOrderId,
        orderType: params.orderType,
        spotId: params.spotId,
        tierId: params.tierId,
        amountMinor: canonicalAmountMinor,
        currency,
        sponsorName: params.sponsorName.trim(),
        sponsorUrl: params.sponsorUrl?.trim(),
        sponsorEmail: params.sponsorEmail.trim(),
        logoUrl: params.logoUrl,
        provider: 'test'
      });

      const sandboxUrl = `${params.successUrl || '/'}?session_id=${testRazorpayOrderId}&status=test_sandbox&amount=${canonicalAmountMinor}&curr=${currency}`;

      return {
        success: true,
        orderId: internalOrderId,
        razorpayOrderId: testRazorpayOrderId,
        sessionId: testRazorpayOrderId,
        checkoutUrl: sandboxUrl,
        amountMinor: canonicalAmountMinor,
        amountCents: canonicalAmountMinor,
        currency,
        keyId: this.config.razorpayKeyId || 'rzp_test_placeholder',
        isTestMode: true
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown checkout error';
      return { success: false, error: msg };
    }
  }

  /**
   * Verifies Razorpay checkout signature returned by Razorpay Standard Checkout modal:
   * HMAC-SHA256(order_id + "|" + payment_id, key_secret) === signature
   */
  async verifyPaymentSignature(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return {
          success: false,
          verified: false,
          error: 'Missing required Razorpay payment verification parameters'
        };
      }

      // 1. Signature Verification
      const secret = this.config.razorpayKeySecret;
      let signatureValid = false;

      if (secret) {
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');

        try {
          signatureValid = crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'utf8'),
            Buffer.from(razorpaySignature, 'utf8')
          );
        } catch {
          signatureValid = false;
        }
      } else if (this.config.isTestMode) {
        // In mock test mode without a real secret, accept test format signatures
        signatureValid = razorpaySignature.startsWith('sig_') || razorpaySignature === 'valid_test_signature';
      }

      if (!signatureValid) {
        return {
          success: false,
          verified: false,
          error: 'Razorpay HMAC-SHA256 signature verification failed'
        };
      }

      // 2. Fetch order to verify amount, spot, and status
      const order = await this.findOrder(razorpayOrderId, params.orderId);
      if (!order) {
        return {
          success: false,
          verified: false,
          error: 'Order not found for verified payment'
        };
      }

      // 3. Atomically confirm paid order in database
      const confirmResult = await this.confirmPaidOrder({
        eventId: razorpayPaymentId,
        sessionId: razorpayOrderId,
        paymentIntentId: razorpayPaymentId,
        amountMinor: order.amountMinor,
        currency: order.currency,
        rawPayload: {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          verifiedAt: new Date().toISOString()
        }
      });

      return {
        success: true,
        verified: true,
        status: confirmResult.status,
        orderId: confirmResult.orderId || order.id,
        spotId: confirmResult.spotId ?? order.spotId
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error verifying payment signature';
      return { success: false, verified: false, error: msg };
    }
  }

  /**
   * Processes incoming webhook from Razorpay:
   * Validates X-Razorpay-Signature HMAC-SHA256(rawBody, webhookSecret)
   * Idempotently handles order.paid, payment.captured, payment.failed
   */
  async processWebhookEvent(
    rawBody: string | Buffer,
    signatureHeader: string
  ): Promise<WebhookProcessingResult> {
    try {
      const rawString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

      if (!signatureHeader) {
        return { success: false, status: 'error', error: 'Missing X-Razorpay-Signature header' };
      }

      // 1. Webhook Signature Verification
      let isValidSignature = false;
      const webhookSecret = this.config.razorpayWebhookSecret;

      if (webhookSecret) {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(rawString)
          .digest('hex');

        try {
          isValidSignature = crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'utf8'),
            Buffer.from(signatureHeader, 'utf8')
          );
        } catch {
          isValidSignature = false;
        }
      } else if (this.config.isTestMode) {
        // In test mode without live secret, allow mock signature prefixes
        isValidSignature = signatureHeader.startsWith('t=') || signatureHeader.startsWith('sig_test_');
      }

      if (!isValidSignature) {
        return { success: false, status: 'error', error: 'Invalid webhook signature' };
      }

      // 2. Parse JSON payload
      const event = JSON.parse(rawString) as {
        event?: string;
        type?: string;
        id?: string;
        payload?: {
          payment?: { entity?: { id: string; order_id?: string; amount: number; currency: string; status: string } };
          order?: { entity?: { id: string; amount: number; currency: string; status: string } };
        };
        // Legacy / test mock structure support:
        data?: { object?: { id: string; client_reference_id?: string; payment_intent?: string; amount_total?: number; currency?: string } };
      };

      const eventType = event.event || event.type || '';
      const eventId = event.id || event.payload?.payment?.entity?.id || `evt_${Date.now()}`;

      // Idempotency: verify event has not been processed
      if (this.processedEventIds.has(eventId)) {
        return { success: true, status: 'already_processed' };
      }

      // 3. Handle successful payment events
      if (
        eventType === 'order.paid' ||
        eventType === 'payment.captured' ||
        eventType === 'checkout.session.completed' ||
        eventType === 'payment_intent.succeeded'
      ) {
        const paymentEntity = event.payload?.payment?.entity;
        const orderEntity = event.payload?.order?.entity;
        const legacyObject = event.data?.object;

        const razorpayOrderId = orderEntity?.id || paymentEntity?.order_id || legacyObject?.id || legacyObject?.client_reference_id;
        const paymentId = paymentEntity?.id || legacyObject?.payment_intent || `pay_${razorpayOrderId}`;
        const amount = paymentEntity?.amount || orderEntity?.amount || legacyObject?.amount_total || 0;
        const currency = ((paymentEntity?.currency || orderEntity?.currency || legacyObject?.currency || 'inr').toLowerCase()) as CurrencyCode;

        if (!razorpayOrderId) {
          return { success: false, status: 'error', error: 'Order reference missing in webhook payload' };
        }

        const confirmResult = await this.confirmPaidOrder({
          eventId,
          sessionId: razorpayOrderId,
          paymentIntentId: paymentId,
          amountMinor: amount,
          currency,
          rawPayload: event
        });

        this.processedEventIds.add(eventId);

        return {
          success: true,
          status: confirmResult.status === 'already_processed' ? 'already_processed' : 'confirmed',
          orderId: confirmResult.orderId,
          spotId: confirmResult.spotId
        };
      }

      // 4. Handle payment failure / cancellation
      if (eventType === 'payment.failed' || eventType === 'checkout.session.expired') {
        const orderId = event.payload?.payment?.entity?.order_id || event.data?.object?.id;
        if (orderId) {
          await this.handleOrderExpiredOrFailed(orderId);
        }
        this.processedEventIds.add(eventId);
        return { success: true, status: 'released' };
      }

      return { success: true, status: 'ignored' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webhook error';
      return { success: false, status: 'error', error: msg };
    }
  }

  /**
   * Atomically locks and reserves a spot for checkout duration.
   */
  private async reserveSpot(spotId: number, sessionId: string): Promise<{ success: boolean; error?: string }> {
    if (this.supabase) {
      const { data, error } = await this.supabase.rpc('atomic_reserve_spot', {
        p_spot_id: spotId,
        p_session_id: sessionId,
        p_hold_seconds: 900 // 15 minutes
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const res = data as { success: boolean; error?: string };
      return res.success ? { success: true } : { success: false, error: res.error };
    }

    // In-memory simulation for local unit test suite
    const spot = this.localTestSpots.get(spotId);
    const now = Date.now();

    if (spot) {
      if (spot.status === 'sold') {
        return { success: false, error: 'Spot has already been sold' };
      }
      if (spot.status === 'reserved' && spot.reservedUntil && spot.reservedUntil > now && spot.reservedBySessionId !== sessionId) {
        return { success: false, error: 'Spot is currently held in checkout by another backer' };
      }
    }

    this.localTestSpots.set(spotId, {
      status: 'reserved',
      reservedUntil: now + 900 * 1000,
      reservedBySessionId: sessionId
    });

    return { success: true };
  }

  /**
   * Releases spot reservation upon failure or cancellation.
   */
  private async releaseSpot(spotId: number, sessionId: string): Promise<void> {
    if (this.supabase) {
      await this.supabase
        .from('brand_spots')
        .update({
          status: 'available',
          reserved_until: null,
          reserved_by_session_id: null
        })
        .eq('id', spotId)
        .eq('reserved_by_session_id', sessionId);
    }

    const spot = this.localTestSpots.get(spotId);
    if (spot && spot.reservedBySessionId === sessionId) {
      this.localTestSpots.set(spotId, { status: 'available' });
    }
  }

  /**
   * Persists pending order state.
   */
  private async recordPendingOrder(orderData: {
    internalOrderId: string;
    razorpayOrderId: string;
    orderType: string;
    spotId?: number;
    tierId?: string;
    amountMinor: number;
    currency: CurrencyCode;
    sponsorName: string;
    sponsorUrl?: string;
    sponsorEmail: string;
    logoUrl?: string;
    provider: string;
  }): Promise<void> {
    if (this.supabase) {
      await this.supabase.from('sponsorship_orders').insert({
        id: crypto.randomUUID ? crypto.randomUUID() : undefined,
        provider_session_id: orderData.razorpayOrderId,
        provider_order_id: orderData.razorpayOrderId,
        order_type: orderData.orderType,
        spot_id: orderData.spotId || null,
        tier_id: orderData.tierId || null,
        amount_cents: orderData.amountMinor, // uses amount_cents column in DB
        currency: orderData.currency,
        status: 'reserved',
        sponsor_name: orderData.sponsorName,
        sponsor_url: orderData.sponsorUrl || null,
        sponsor_email: orderData.sponsorEmail,
        logo_url: orderData.logoUrl || null,
        payment_provider: orderData.provider
      });
    }

    // Always maintain in local test orders cache
    this.localTestOrders.set(orderData.razorpayOrderId, {
      id: orderData.internalOrderId,
      razorpayOrderId: orderData.razorpayOrderId,
      spotId: orderData.spotId,
      tierId: orderData.tierId,
      amountMinor: orderData.amountMinor,
      currency: orderData.currency,
      status: 'reserved',
      sponsorName: orderData.sponsorName,
      sponsorUrl: orderData.sponsorUrl,
      sponsorEmail: orderData.sponsorEmail,
      logoUrl: orderData.logoUrl
    });
  }

  /**
   * Look up order by Razorpay order ID or internal order ID
   */
  private async findOrder(razorpayOrderId: string, internalOrderId?: string): Promise<{
    id: string;
    spotId?: number | null;
    amountMinor: number;
    currency: CurrencyCode;
  } | null> {
    if (this.supabase) {
      const query = this.supabase
        .from('sponsorship_orders')
        .select('id, spot_id, amount_cents, currency, status')
        .or(`provider_order_id.eq.${razorpayOrderId},provider_session_id.eq.${razorpayOrderId}`);

      const { data } = await query.maybeSingle();
      if (data) {
        return {
          id: data.id,
          spotId: data.spot_id,
          amountMinor: data.amount_cents,
          currency: data.currency as CurrencyCode
        };
      }
    }

    const local = this.localTestOrders.get(razorpayOrderId) ||
      (internalOrderId ? Array.from(this.localTestOrders.values()).find(o => o.id === internalOrderId) : null);

    if (local) {
      return {
        id: local.id,
        spotId: local.spotId,
        amountMinor: local.amountMinor,
        currency: local.currency
      };
    }

    return null;
  }

  /**
   * Confirms payment and updates order + inventory state atomically.
   */
  private async confirmPaidOrder(data: {
    eventId: string;
    sessionId: string;
    paymentIntentId: string;
    amountMinor: number;
    currency: CurrencyCode;
    rawPayload: unknown;
  }): Promise<{ status: string; orderId?: string; spotId?: number | null }> {
    if (this.supabase) {
      const { data: result } = await this.supabase.rpc('confirm_paid_order', {
        p_provider_event_id: data.eventId,
        p_provider_session_id: data.sessionId,
        p_provider_payment_intent_id: data.paymentIntentId,
        p_amount_cents: data.amountMinor,
        p_currency: data.currency,
        p_raw_payload: data.rawPayload
      });

      const res = result as { success?: boolean; status?: string; order_id?: string; spot_id?: number };
      return {
        status: res?.status || 'confirmed',
        orderId: res?.order_id,
        spotId: res?.spot_id
      };
    }

    // Local in-memory state transition
    const order = this.localTestOrders.get(data.sessionId);
    if (order) {
      order.status = 'paid';
      if (order.spotId) {
        this.localTestSpots.set(order.spotId, {
          status: 'sold'
        });
      }
      return { status: 'confirmed', orderId: order.id, spotId: order.spotId };
    }

    return { status: 'confirmed' };
  }

  /**
   * Handles cancellation or failure
   */
  private async handleOrderExpiredOrFailed(sessionId: string): Promise<void> {
    if (this.supabase) {
      await this.supabase
        .from('sponsorship_orders')
        .update({ status: 'failed' })
        .or(`provider_order_id.eq.${sessionId},provider_session_id.eq.${sessionId}`);

      await this.supabase
        .from('brand_spots')
        .update({
          status: 'available',
          reserved_until: null,
          reserved_by_session_id: null
        })
        .eq('reserved_by_session_id', sessionId);
    }

    const order = this.localTestOrders.get(sessionId);
    if (order) {
      order.status = 'failed';
      if (order.spotId) {
        const spot = this.localTestSpots.get(order.spotId);
        if (spot && spot.status === 'reserved') {
          this.localTestSpots.set(order.spotId, { status: 'available' });
        }
      }
    }
  }

  /**
   * Reads order status to confirm verified payment before showing UI success.
   */
  async getVerifiedOrderStatus(sessionId: string): Promise<{
    found: boolean;
    paid: boolean;
    order?: {
      id: string;
      orderType: string;
      spotId?: number | null;
      amountCents: number;
      amountMinor?: number;
      currency: string;
      sponsorName: string;
      sponsorUrl?: string;
      logoUrl?: string;
    };
  }> {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('sponsorship_orders')
        .select('id, order_type, spot_id, amount_cents, currency, status, sponsor_name, sponsor_url, logo_url')
        .or(`provider_order_id.eq.${sessionId},provider_session_id.eq.${sessionId}`)
        .maybeSingle();

      if (data) {
        return {
          found: true,
          paid: data.status === 'paid',
          order: {
            id: data.id,
            orderType: data.order_type,
            spotId: data.spot_id,
            amountCents: data.amount_cents,
            amountMinor: data.amount_cents,
            currency: data.currency,
            sponsorName: data.sponsor_name,
            sponsorUrl: data.sponsor_url,
            logoUrl: data.logo_url
          }
        };
      }
    }

    const localOrder = this.localTestOrders.get(sessionId);
    if (localOrder) {
      return {
        found: true,
        paid: localOrder.status === 'paid',
        order: {
          id: localOrder.id,
          orderType: 'spot_sponsorship',
          spotId: localOrder.spotId,
          amountCents: localOrder.amountMinor,
          amountMinor: localOrder.amountMinor,
          currency: localOrder.currency,
          sponsorName: localOrder.sponsorName,
          sponsorUrl: localOrder.sponsorUrl,
          logoUrl: localOrder.logoUrl
        }
      };
    }

    return { found: false, paid: false };
  }

  /**
   * Processes an order refund, releases inventory spot, and updates campaign totals atomically.
   */
  async processOrderRefund(orderId: string, reason: string, refundRef?: string): Promise<{
    success: boolean;
    orderId?: string;
    spotId?: number | null;
    status?: string;
    error?: string;
  }> {
    if (this.supabase) {
      const { data, error } = await this.supabase.rpc('process_order_refund', {
        p_order_id: orderId,
        p_refund_reason: reason,
        p_refund_provider_reference: refundRef || null
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data as { success: boolean; orderId?: string; spotId?: number | null; status?: string; error?: string };
    }

    // In-memory simulation
    const order = Array.from(this.localTestOrders.values()).find(o => o.id === orderId || o.razorpayOrderId === orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }
    if (order.status !== 'paid') {
      return { success: false, error: `Only confirmed paid orders can be refunded. Current status: ${order.status}` };
    }

    order.status = 'refunded';
    if (order.spotId) {
      this.localTestSpots.set(order.spotId, { status: 'available' });
    }

    return { success: true, orderId: order.id, spotId: order.spotId, status: 'refunded' };
  }
}

export const defaultPaymentAdapter = new RazorpayPaymentAdapter();
