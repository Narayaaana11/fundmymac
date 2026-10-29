// =========================================================================
// Fund My Mac Payment & Order Types
// =========================================================================

export type OrderType = 'spot_sponsorship' | 'tier_sponsorship' | 'custom_donation';
export type CurrencyCode = 'usd' | 'eur';
export type OrderStatus = 'pending' | 'reserved' | 'paid' | 'failed' | 'cancelled' | 'expired';

export interface CreateCheckoutSessionParams {
  orderType: OrderType;
  spotId?: number;
  tierId?: string;
  customAmountCents?: number;
  currency: CurrencyCode;
  sponsorName: string;
  sponsorUrl?: string;
  sponsorEmail: string;
  logoUrl?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  success: boolean;
  orderId?: string;
  sessionId?: string;
  checkoutUrl?: string;
  amountCents?: number;
  currency?: CurrencyCode;
  isTestMode?: boolean;
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
  priceUsdCents: number;
  priceEurCents: number;
}

export interface CanonicalTier {
  id: string;
  name: string;
  priceUsdCents: number;
  priceEurCents: number;
}
