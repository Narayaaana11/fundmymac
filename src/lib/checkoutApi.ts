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

/**
 * Initiates Razorpay Order creation on backend.
 */
export async function initiateCheckoutSession(
  params: Omit<CreateCheckoutSessionParams, 'successUrl' | 'cancelUrl'>
): Promise<CheckoutSessionResult> {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const successUrl = `${currentOrigin}/`;
  const cancelUrl = `${currentOrigin}/`;

  const payload: CreateCheckoutSessionParams = {
    ...params,
    successUrl,
    cancelUrl
  };

  try {
    const response = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
  try {
    const response = await fetch('/api/checkout/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
  try {
    const response = await fetch(`/api/checkout/verify-session?session_id=${encodeURIComponent(sessionId)}`);
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
