// =========================================================================
// Client-side Checkout API Client
// Securely interacts with backend checkout session endpoints.
// =========================================================================

import type {
  CreateCheckoutSessionParams,
  CheckoutSessionResult
} from '../server/payment/types';

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
    const response = await fetch('/api/checkout/create-session', {
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

export async function verifyCheckoutSession(sessionId: string): Promise<{
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

export async function simulateTestModePayment(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch('/api/checkout/simulate-test-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    return await response.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Simulation error';
    return { success: false, error: msg };
  }
}
