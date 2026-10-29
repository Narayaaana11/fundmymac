// =========================================================================
// Client-side Checkout API Client — Razorpay Standard Checkout
// Securely interacts with backend Razorpay order and verification endpoints.
// =========================================================================

import type {
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  VerifyPaymentParams,
  VerifyPaymentResult
} from '../server/payment/types';
import { IS_PUBLIC_PREVIEW } from '../config/previewConfig.ts';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: string, callback: (response: unknown) => void) => void;
}

/**
 * Dynamically loads the Razorpay checkout.js SDK
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) || '';
const BACKEND_API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_API_URL) || '';

export interface ApiConfig {
  createOrderUrl: string;
  verifyPaymentUrl: string;
  verifySessionUrl: (sessionId: string) => string;
  headers: Record<string, string>;
}

/**
 * Resolves API endpoints:
 * - In production static hosting: routes directly to Supabase Edge Functions with anon key auth.
 * - In local development / Node servers: routes to local middleware (/api/checkout/...).
 */
export function getApiConfig(): ApiConfig {
  const isProd = typeof import.meta !== 'undefined' && import.meta.env?.PROD;
  const forceEdge = typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_EDGE_FUNCTIONS === 'true';
  const useEdgeFunctions = (isProd && !BACKEND_API_URL && !!SUPABASE_URL) || forceEdge;

  if (useEdgeFunctions) {
    const edgeBase = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1`;
    return {
      createOrderUrl: `${edgeBase}/create-razorpay-order`,
      verifyPaymentUrl: `${edgeBase}/verify-razorpay-payment`,
      verifySessionUrl: (sessionId: string) => `${edgeBase}/verify-razorpay-payment?session_id=${encodeURIComponent(sessionId)}`,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };
  }

  const base = BACKEND_API_URL ? BACKEND_API_URL.replace(/\/$/, '') : '';
  return {
    createOrderUrl: `${base}/api/checkout/create-order`,
    verifyPaymentUrl: `${base}/api/checkout/verify-payment`,
    verifySessionUrl: (sessionId: string) => `${base}/api/checkout/verify-session?session_id=${encodeURIComponent(sessionId)}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };
}

/**
 * Initiates Razorpay Order creation on backend.
 */
export async function initiateCheckoutSession(
  params: Omit<CreateCheckoutSessionParams, 'successUrl' | 'cancelUrl'>
): Promise<CheckoutSessionResult> {
  if (IS_PUBLIC_PREVIEW) {
    return {
      success: false,
      previewMode: true,
      error: 'Sponsorship checkout is currently opening soon. Public preview is active; orders cannot be placed at this time. Please join the waitlist.'
    };
  }

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const successUrl = `${currentOrigin}/`;
  const cancelUrl = `${currentOrigin}/`;

  const payload: CreateCheckoutSessionParams = {
    ...params,
    successUrl,
    cancelUrl
  };

  const config = getApiConfig();

  try {
    const response = await fetch(config.createOrderUrl, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(payload)
    });

    const data: CheckoutSessionResult = await response.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error during checkout initiation';
    return {
      success: false,
      error: msg
    };
  }
}

/**
 * Sends client checkout response to backend for HMAC-SHA256 signature verification.
 */
export async function verifyRazorpayPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
  const config = getApiConfig();

  try {
    const response = await fetch(config.verifyPaymentUrl, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(params)
    });

    const data: VerifyPaymentResult = await response.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error during payment verification';
    return {
      success: false,
      verified: false,
      error: msg
    };
  }
}

/**
 * Verifies order payment status from backend database.
 */
export async function verifyCheckoutSession(sessionId: string): Promise<{
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
  error?: string;
}> {
  const config = getApiConfig();

  try {
    const response = await fetch(config.verifySessionUrl(sessionId), {
      headers: config.headers
    });
    if (!response.ok) {
      return { paid: false, error: `Verification returned status ${response.status}` };
    }
    const data = await response.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Verification network error';
    return { paid: false, error: msg };
  }
}

/**
 * Simulates test mode webhook delivery for development and QA testing.
 */
export async function simulateTestModePayment(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch('/api/checkout/simulate-test-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ razorpayOrderId: sessionId, sessionId })
    });
    return await response.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Simulation error';
    return { success: false, error: msg };
  }
}
