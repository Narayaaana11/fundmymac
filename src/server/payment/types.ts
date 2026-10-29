// =========================================================================
// Fund My Mac Payment & Order Types — Razorpay Integration
// =========================================================================

export type OrderType = 'spot_sponsorship' | 'tier_sponsorship' | 'custom_donation';
export type CurrencyCode = 'inr' | 'usd' | 'eur';
export type OrderStatus = 'pending' | 'reserved' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';

export interface CreateCheckoutSessionParams {
  orderType: OrderType;
  spotId?: number;
  tierId?: string;
  customAmountMinor?: number; // in minor units (paise or cents)
  customAmountCents?: number; // legacy alias
  currency: CurrencyCode;
  sponsorName: string;
  sponsorUrl?: string;
  sponsorEmail: string;
  logoUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResult {
  success: boolean;
  orderId?: string;
  razorpayOrderId?: string;
  sessionId?: string; // legacy alias
  amountMinor?: number;
  amountCents?: number; // legacy alias
  currency?: CurrencyCode;
  keyId?: string;
  checkoutUrl?: string;
  isTestMode?: boolean;
  error?: string;
}

export interface VerifyPaymentParams {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  orderId?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  verified: boolean;
  status?: string;
  orderId?: string;
  spotId?: number | null;
  error?: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  status: 'confirmed' | 'already_processed' | 'released' | 'ignored' | 'error';
  orderId?: string;
  spotId?: number | null;
  error?: string;
}

export interface CanonicalSpot {
  id: number;
  name: string;
  surface: 'lid' | 'inside' | 'accessory';
  priceInrPaise: number;
  priceUsdCents: number;
  priceEurCents: number;
}

export interface CanonicalTier {
  id: string;
  name: string;
  priceInrPaise: number;
  priceUsdCents: number;
  priceEurCents: number;
}
