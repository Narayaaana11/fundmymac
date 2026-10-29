// =========================================================================
// Local API Middleware for Vite Dev Server & Automated Testing
// Routes:
// - POST /api/checkout/create-session
// - GET  /api/checkout/verify-session
// - POST /api/checkout/webhook
// - POST /api/checkout/simulate-test-payment
// =========================================================================

import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { defaultPaymentAdapter } from './payment/stripeAdapter.ts';
import type { CreateCheckoutSessionParams } from './payment/types.ts';

function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
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
          // 1. Create checkout session
          if (url.pathname === '/api/checkout/create-session' && req.method === 'POST') {
            const body = await parseJsonBody<CreateCheckoutSessionParams>(req);
            const result = await defaultPaymentAdapter.createCheckoutSession(body);
            return sendJson(res, result.success ? 200 : 400, result);
          }

          // 2. Verify session payment status
          if (url.pathname === '/api/checkout/verify-session' && req.method === 'GET') {
            const sessionId = url.searchParams.get('session_id');
            if (!sessionId) {
              return sendJson(res, 400, { error: 'session_id query param is required' });
            }
            const status = await defaultPaymentAdapter.getVerifiedOrderStatus(sessionId);
            return sendJson(res, 200, status);
          }

          // 3. Webhook listener
          if (url.pathname === '/api/checkout/webhook' && req.method === 'POST') {
            const sig = (req.headers['stripe-signature'] as string) || '';
            const rawBody = await new Promise<string>((resolve) => {
              let body = '';
              req.on('data', (chunk) => (body += chunk));
              req.on('end', () => resolve(body));
            });

            const result = await defaultPaymentAdapter.processWebhookEvent(rawBody, sig);
            return sendJson(res, result.success ? 200 : 400, result);
          }

          // 4. Test Sandbox Payment Simulation (Development / Sandbox only)
          if (url.pathname === '/api/checkout/simulate-test-payment' && req.method === 'POST') {
            const body = await parseJsonBody<{ sessionId: string }>(req);
            if (!body.sessionId) {
              return sendJson(res, 400, { error: 'sessionId required' });
            }

            const mockEvent = {
              id: `evt_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              type: 'checkout.session.completed',
              data: {
                object: {
                  id: body.sessionId,
                  client_reference_id: body.sessionId,
                  payment_intent: `pi_test_${body.sessionId}`,
                  amount_total: 10000,
                  currency: 'usd'
                }
              }
            };

            const result = await defaultPaymentAdapter.processWebhookEvent(
              JSON.stringify(mockEvent),
              't=1700000000,v1=test_signature'
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
