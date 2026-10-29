// =========================================================================
// Local API Middleware for Vite Dev Server & Automated Testing
// Endpoints:
// - POST /api/checkout/create-order (alias: /api/checkout/create-session)
// - POST /api/checkout/verify-payment
// - GET  /api/checkout/verify-session (alias: /api/checkout/verify-order)
// - POST /api/checkout/webhook
// - POST /api/checkout/simulate-test-payment (test/dev sandbox only)
// =========================================================================

import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { defaultPaymentAdapter } from './payment/razorpayAdapter.ts';
import type { CreateCheckoutSessionParams, VerifyPaymentParams } from './payment/types.ts';

function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : ({} as T));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function fundMyMacApiPlugin(): Plugin {
  return {
    name: 'fundmymac-checkout-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ? new URL(req.url, 'http://localhost') : null;
        if (!url || !url.pathname.startsWith('/api/checkout/')) {
          return next();
        }

        try {
          // 1. Create Razorpay Checkout Order
          if (
            (url.pathname === '/api/checkout/create-order' || url.pathname === '/api/checkout/create-session') &&
            req.method === 'POST'
          ) {
            const body = await parseJsonBody<CreateCheckoutSessionParams>(req);
            const result = await defaultPaymentAdapter.createCheckoutSession(body);
            return sendJson(res, result.success ? 200 : 400, result);
          }

          // 2. Verify Razorpay Payment Signature
          if (url.pathname === '/api/checkout/verify-payment' && req.method === 'POST') {
            const body = await parseJsonBody<VerifyPaymentParams>(req);
            const result = await defaultPaymentAdapter.verifyPaymentSignature(body);
            return sendJson(res, result.success ? 200 : 400, result);
          }

          // 3. Verify Order / Session Payment Status
          if (
            (url.pathname === '/api/checkout/verify-session' || url.pathname === '/api/checkout/verify-order') &&
            req.method === 'GET'
          ) {
            const sessionId = url.searchParams.get('session_id') || url.searchParams.get('order_id');
            if (!sessionId) {
              return sendJson(res, 400, { error: 'session_id or order_id query param is required' });
            }
            const status = await defaultPaymentAdapter.getVerifiedOrderStatus(sessionId);
            return sendJson(res, 200, status);
          }

          // 4. Razorpay Webhook Listener
          if (url.pathname === '/api/checkout/webhook' && req.method === 'POST') {
            const sig = (req.headers['x-razorpay-signature'] as string) || '';

            const rawBody = await new Promise<string>((resolve) => {
              let body = '';
              req.on('data', (chunk) => (body += chunk));
              req.on('end', () => resolve(body));
            });

            const result = await defaultPaymentAdapter.processWebhookEvent(rawBody, sig);
            return sendJson(res, result.success ? 200 : 400, result);
          }

          // 5. Test Sandbox Simulation (Development / Test only — never allowed with live credentials)
          if (url.pathname === '/api/checkout/simulate-test-payment' && req.method === 'POST') {
            if (process.env.NODE_ENV === 'production' && !defaultPaymentAdapter.config.isTestMode) {
              return sendJson(res, 403, { error: 'Simulation disabled in production environment' });
            }

            const body = await parseJsonBody<{ sessionId?: string; razorpayOrderId?: string }>(req);
            const orderId = body.razorpayOrderId || body.sessionId;
            if (!orderId) {
              return sendJson(res, 400, { error: 'orderId or sessionId required' });
            }

            const mockPaymentId = `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const mockWebhook = {
              entity: 'event',
              account_id: 'acc_test',
              event: 'order.paid',
              contains: ['payment', 'order'],
              payload: {
                payment: {
                  entity: {
                    id: mockPaymentId,
                    entity: 'payment',
                    amount: 2100000,
                    currency: 'INR',
                    status: 'captured',
                    order_id: orderId
                  }
                },
                order: {
                  entity: {
                    id: orderId,
                    entity: 'order',
                    amount: 2100000,
                    currency: 'INR',
                    status: 'paid'
                  }
                }
              },
              created_at: Math.floor(Date.now() / 1000)
            };

            const result = await defaultPaymentAdapter.processWebhookEvent(
              JSON.stringify(mockWebhook),
              'sig_test_simulated'
            );

            return sendJson(res, result.success ? 200 : 400, result);
          }

          return next();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Server error';
          return sendJson(res, 500, { error: msg });
        }
      });
    }
  };
}
