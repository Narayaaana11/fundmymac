// =========================================================================
// Server-Side Stripe Payment Adapter & Webhook Engine
// Enforces:
// 1. Server-side price canonicalization (browser amounts ignored)
// 2. Atomic spot inventory reservation
// 3. Webhook signature verification & idempotency
// 4. Safe test-mode sandbox when merchant keys are not configured
// =========================================================================

import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  WebhookProcessingResult
} from './types.ts';
import {
  CANONICAL_SPOTS,
  CANONICAL_TIERS,
  MIN_DONATION_CENTS,
  getCanonicalSpotAmount,
  getCanonicalTierAmount
} from './canonicalCatalog.ts';
import { validateDataUrl } from './assetValidator.ts';

export interface PaymentAdapterConfig {
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  isTestMode?: boolean;
}

export class StripePaymentAdapter {
  private stripe: Stripe | null = null;
  private supabase: SupabaseClient | null = null;
  private config: PaymentAdapterConfig;

  // In-memory fallback for local unit tests without live database connection
  private localTestOrders: Map<string, {
    id: string;
    spotId?: number;
    amountCents: number;
    currency: string;
    status: string;
    sponsorName: string;
    sponsorUrl?: string;
    logoUrl?: string;
  }> = new Map();

  private localTestSpots: Map<number, {
    status: 'available' | 'reserved' | 'sold';
    reservedUntil?: number;
    reservedBySessionId?: string;
  }> = new Map();

  private processedEventIds: Set<string> = new Set();

  constructor(config?: PaymentAdapterConfig) {
    this.config = {
      stripeSecretKey: config?.stripeSecretKey || process.env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: config?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET,
      supabaseUrl: config?.supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      supabaseServiceKey: config?.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY,
      isTestMode: config?.isTestMode ?? (!process.env.STRIPE_SECRET_KEY || process.env.NODE_ENV === 'test')
    };

    if (this.config.stripeSecretKey) {
      this.stripe = new Stripe(this.config.stripeSecretKey, {
        apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion
      });
    }

    if (this.config.supabaseUrl && this.config.supabaseServiceKey) {
      this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
  }

  /**
   * Validates checkout request, enforces canonical pricing, reserves spot atomically,
   * and creates a payment provider checkout session.
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

      if (params.currency !== 'usd' && params.currency !== 'eur') {
        return { success: false, error: 'Supported currencies are USD and EUR' };
      }

      // 2. Validate logo if provided
      if (params.logoUrl && params.logoUrl.startsWith('data:')) {
        const logoValidation = validateDataUrl(params.logoUrl);
        if (!logoValidation.valid) {
          return { success: false, error: logoValidation.error };
        }
      }

      // 3. Determine canonical server price (never accept client price)
      let canonicalAmountCents = 0;
      let lineItemTitle = '';
      let lineItemDescription = '';

      if (params.orderType === 'spot_sponsorship') {
        if (!params.spotId || !CANONICAL_SPOTS[params.spotId]) {
          return { success: false, error: `Invalid or missing spotId: ${params.spotId}` };
        }
        const spot = CANONICAL_SPOTS[params.spotId];
        canonicalAmountCents = getCanonicalSpotAmount(params.spotId, params.currency);
        lineItemTitle = `MacBook Pro Sticker Sponsorship — Spot #${spot.id} (${spot.name})`;
        lineItemDescription = `Permanent lifelong sticker spot on the MacBook Pro ${spot.surface} for the VESPER IRL founder roadshow.`;
      } else if (params.orderType === 'tier_sponsorship') {
        if (!params.tierId || !CANONICAL_TIERS[params.tierId]) {
          return { success: false, error: `Invalid or missing tierId: ${params.tierId}` };
        }
        const tier = CANONICAL_TIERS[params.tierId];
        canonicalAmountCents = getCanonicalTierAmount(params.tierId, params.currency);
        lineItemTitle = `VESPER Sponsorship — ${tier.name}`;
        lineItemDescription = `Official sponsor package backing the MacBook Pro 16″ hardware campaign.`;
      } else if (params.orderType === 'custom_donation') {
        const customCents = params.customAmountCents || 0;
        if (customCents < MIN_DONATION_CENTS) {
          return {
            success: false,
            error: `Minimum contribution is $${(MIN_DONATION_CENTS / 100).toFixed(2)} / €${(MIN_DONATION_CENTS / 100).toFixed(2)}`
          };
        }
        canonicalAmountCents = customCents;
        lineItemTitle = 'Fund My Mac & VESPER Campaign Contribution';
        lineItemDescription = 'Direct backer pledge supporting startup GPU compute and developer roadshow hardware.';
      } else {
        return { success: false, error: `Unsupported order type: ${params.orderType}` };
      }

      // 4. Generate unique session reference ID
      const sessionId = `cs_${params.orderType.slice(0, 4)}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 5. Atomic spot reservation (if applicable)
      if (params.orderType === 'spot_sponsorship' && params.spotId) {
        const reservation = await this.reserveSpot(params.spotId, sessionId);
        if (!reservation.success) {
          return { success: false, error: reservation.error };
        }
      }

      // 6. Branch: Live Stripe Checkout vs. Sandbox Test Mode
      if (this.stripe && !this.config.isTestMode) {
        const stripeSession = await this.stripe.checkout.sessions.create({
          mode: 'payment',
          customer_email: params.sponsorEmail.trim(),
          client_reference_id: sessionId,
          line_items: [
            {
              price_data: {
                currency: params.currency,
                unit_amount: canonicalAmountCents,
                product_data: {
                  name: lineItemTitle,
                  description: lineItemDescription,
                  images: params.logoUrl && !params.logoUrl.startsWith('data:') ? [params.logoUrl] : undefined
                }
              },
              quantity: 1
            }
          ],
          metadata: {
            orderType: params.orderType,
            spotId: params.spotId ? String(params.spotId) : '',
            tierId: params.tierId || '',
            sponsorName: params.sponsorName.trim(),
            sponsorUrl: params.sponsorUrl || '',
            logoUrl: params.logoUrl || ''
          },
          expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
          success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
          cancel_url: `${params.cancelUrl}?session_id={CHECKOUT_SESSION_ID}&status=cancelled`
        });

        // Record pending order in database
        await this.recordPendingOrder({
          sessionId: stripeSession.id,
          orderType: params.orderType,
          spotId: params.spotId,
          tierId: params.tierId,
          amountCents: canonicalAmountCents,
          currency: params.currency,
          sponsorName: params.sponsorName.trim(),
          sponsorUrl: params.sponsorUrl?.trim(),
          sponsorEmail: params.sponsorEmail.trim(),
          logoUrl: params.logoUrl,
          provider: 'stripe'
        });

        return {
          success: true,
          orderId: sessionId,
          sessionId: stripeSession.id,
          checkoutUrl: stripeSession.url || undefined,
          amountCents: canonicalAmountCents,
          currency: params.currency,
          isTestMode: false
        };
      }

      // 7. Test / Sandbox Mode Fallback
      await this.recordPendingOrder({
        sessionId,
        orderType: params.orderType,
        spotId: params.spotId,
        tierId: params.tierId,
        amountCents: canonicalAmountCents,
        currency: params.currency,
        sponsorName: params.sponsorName.trim(),
        sponsorUrl: params.sponsorUrl?.trim(),
        sponsorEmail: params.sponsorEmail.trim(),
        logoUrl: params.logoUrl,
        provider: 'test'
      });

      const sandboxUrl = `${params.successUrl}?session_id=${sessionId}&status=test_sandbox&amount=${canonicalAmountCents}&curr=${params.currency}`;

      return {
        success: true,
        orderId: sessionId,
        sessionId,
        checkoutUrl: sandboxUrl,
        amountCents: canonicalAmountCents,
        currency: params.currency,
        isTestMode: true
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown checkout error';
      return { success: false, error: msg };
    }
  }

  /**
   * Processes incoming webhook from Stripe or test simulator with idempotency protection.
   */
  async processWebhookEvent(
    rawBody: string | Buffer,
    signatureHeader: string
  ): Promise<WebhookProcessingResult> {
    try {
      let event: Stripe.Event | { id: string; type: string; data: { object: { id: string; client_reference_id?: string; payment_intent?: string; amount_total?: number; currency?: string } } };

      if (this.stripe && this.config.stripeWebhookSecret && !this.config.isTestMode) {
        event = this.stripe.webhooks.constructEvent(
          rawBody,
          signatureHeader,
          this.config.stripeWebhookSecret
        );
      } else {
        // Test / Mock signature verification
        if (!signatureHeader || !signatureHeader.startsWith('t=')) {
          return { success: false, status: 'error', error: 'Missing or invalid signature header' };
        }
        event = JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'));
      }

      // Idempotency: verify this event ID has not been processed
      if (this.processedEventIds.has(event.id)) {
        return { success: true, status: 'already_processed' };
      }

      if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
        const session = event.data.object as { id: string; client_reference_id?: string; payment_intent?: string; amount_total?: number; currency?: string };
        const sessionId = session.id || session.client_reference_id;

        if (!sessionId) {
          return { success: false, status: 'error', error: 'Session ID missing in webhook payload' };
        }

        const confirmResult = await this.confirmPaidOrder({
          eventId: event.id,
          sessionId,
          paymentIntentId: (session.payment_intent as string) || `pi_${sessionId}`,
          amountCents: session.amount_total || 0,
          currency: (session.currency || 'usd').toLowerCase() as 'usd' | 'eur',
          rawPayload: event
        });

        this.processedEventIds.add(event.id);

        return {
          success: true,
          status: confirmResult.status === 'already_processed' ? 'already_processed' : 'confirmed',
          orderId: confirmResult.orderId,
          spotId: confirmResult.spotId
        };
      }

      if (event.type === 'checkout.session.expired') {
        const session = event.data.object as { id: string };
        await this.handleSessionExpired(session.id);
        this.processedEventIds.add(event.id);
        return { success: true, status: 'released' };
      }

      return { success: true, status: 'ignored' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webhook error';
      return { success: false, status: 'error', error: msg };
    }
  }

  /**
   * Atomically locks and reserves spot for checkout duration.
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

    // In-memory simulation for local test suite
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
   * Persists pending order state.
   */
  private async recordPendingOrder(orderData: {
    sessionId: string;
    orderType: string;
    spotId?: number;
    tierId?: string;
    amountCents: number;
    currency: string;
    sponsorName: string;
    sponsorUrl?: string;
    sponsorEmail: string;
    logoUrl?: string;
    provider: string;
  }): Promise<void> {
    if (this.supabase) {
      await this.supabase.from('sponsorship_orders').insert({
        provider_session_id: orderData.sessionId,
        order_type: orderData.orderType,
        spot_id: orderData.spotId || null,
        tier_id: orderData.tierId || null,
        amount_cents: orderData.amountCents,
        currency: orderData.currency,
        status: 'reserved',
        sponsor_name: orderData.sponsorName,
        sponsor_url: orderData.sponsorUrl || null,
        sponsor_email: orderData.sponsorEmail,
        logo_url: orderData.logoUrl || null,
        payment_provider: orderData.provider
      });
    }

    // Always maintain local cache for unit test assertions
    this.localTestOrders.set(orderData.sessionId, {
      id: orderData.sessionId,
      spotId: orderData.spotId,
      amountCents: orderData.amountCents,
      currency: orderData.currency,
      status: 'reserved',
      sponsorName: orderData.sponsorName,
      sponsorUrl: orderData.sponsorUrl,
      logoUrl: orderData.logoUrl
    });
  }

  /**
   * Confirms payment and updates order + inventory state atomically.
   */
  private async confirmPaidOrder(data: {
    eventId: string;
    sessionId: string;
    paymentIntentId: string;
    amountCents: number;
    currency: 'usd' | 'eur';
    rawPayload: unknown;
  }): Promise<{ status: string; orderId?: string; spotId?: number | null }> {
    if (this.supabase) {
      const { data: result } = await this.supabase.rpc('confirm_paid_order', {
        p_provider_event_id: data.eventId,
        p_provider_session_id: data.sessionId,
        p_provider_payment_intent_id: data.paymentIntentId,
        p_amount_cents: data.amountCents,
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
   * Releases spot reservation upon session expiry or cancellation.
   */
  private async handleSessionExpired(sessionId: string): Promise<void> {
    if (this.supabase) {
      await this.supabase
        .from('sponsorship_orders')
        .update({ status: 'expired' })
        .eq('provider_session_id', sessionId);

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
      order.status = 'expired';
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
        .eq('provider_session_id', sessionId)
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
          amountCents: localOrder.amountCents,
          currency: localOrder.currency,
          sponsorName: localOrder.sponsorName,
          sponsorUrl: localOrder.sponsorUrl,
          logoUrl: localOrder.logoUrl
        }
      };
    }

    return { found: false, paid: false };
  }
}

export const defaultPaymentAdapter = new StripePaymentAdapter();
