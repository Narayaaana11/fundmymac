import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { verifyCheckoutSession, simulateTestModePayment } from '../lib/checkoutApi';

interface CheckoutVerificationModalProps {
  sessionId: string;
  initialStatus: string;
  onClose: () => void;
  onPaymentConfirmed?: () => void;
}

export const CheckoutVerificationModal: React.FC<CheckoutVerificationModalProps> = ({
  sessionId,
  initialStatus,
  onClose,
  onPaymentConfirmed
}) => {
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{
    sponsorName?: string;
    spotId?: number | null;
    amountCents?: number;
    currency?: string;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await verifyCheckoutSession(sessionId);
        if (!isMounted) return;

        if (res.paid && res.order) {
          setIsPaid(true);
          setOrderDetails({
            sponsorName: res.order.sponsorName,
            spotId: res.order.spotId,
            amountCents: res.order.amountCents,
            currency: res.order.currency
          });
          confetti({
            particleCount: 110,
            spread: 75,
            origin: { y: 0.6 }
          });
          if (onPaymentConfirmed) onPaymentConfirmed();
        } else if (initialStatus === 'test_sandbox') {
          // In test sandbox mode, we await explicit simulation
          setOrderDetails(res.order || null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error verifying checkout session');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [sessionId, initialStatus, onPaymentConfirmed]);

  const handleSimulateWebhook = async () => {
    setIsSimulating(true);
    setError(null);
    try {
      const res = await simulateTestModePayment(sessionId);
      if (!res.success) {
        setError(res.error || 'Failed to simulate test payment confirmation');
        setIsSimulating(false);
        return;
      }

      // Re-verify after webhook simulation
      const verifyRes = await verifyCheckoutSession(sessionId);
      if (verifyRes.paid) {
        setIsPaid(true);
        setOrderDetails(verifyRes.order || null);
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        if (onPaymentConfirmed) onPaymentConfirmed();
      } else {
        setError('Payment verification still pending.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const amountDisplay = orderDetails?.amountCents
    ? `${(orderDetails.amountCents / 100).toLocaleString()} ${orderDetails.currency?.toUpperCase()}`
    : '';

  return (
    <div className="bmm-modal-overlay" onClick={onClose}>
      <div className="bmm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <button
          type="button"
          onClick={onClose}
          className="bmm-modal-close"
          aria-label="Close"
        >
          ✕
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div className="bmm-spinner" style={{ margin: '0 auto 16px', width: '36px', height: '36px', border: '3px solid #e5e5ea', borderTopColor: '#0071e3', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 600 }}>Verifying Payment Status...</h4>
            <p style={{ fontSize: '13px', color: '#86868b', marginTop: '6px' }}>
              Confirming transaction signatures with server...
            </p>
          </div>
        ) : isPaid ? (
          <div className="bmm-modal-success-box">
            <div className="bmm-success-icon-ring">✓</div>
            <h3 className="bmm-modal-title" style={{ marginTop: '14px' }}>
              Payment Confirmed!
            </h3>
            <p className="bmm-modal-subtitle" style={{ maxWidth: '400px', margin: '8px auto 16px auto' }}>
              Thank you <strong>{orderDetails?.sponsorName || 'Backer'}</strong>! Your payment of <strong>{amountDisplay}</strong> has been verified.
              {orderDetails?.spotId
                ? ` Spot #${orderDetails.spotId} is now officially locked and queued for printing!`
                : ' Your pledge has been recorded in our campaign ledger.'}
            </p>

            {/* Share on X */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `We just backed the @VESPER MacBook Pro campaign! 🚀 Check out the machine & get your brand on it:`
              )}&url=${encodeURIComponent('https://fundmymac.com')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bmm-btn-share-x"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: '#000000',
                color: '#ffffff',
                padding: '11px 0',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '13px',
                textDecoration: 'none',
                marginBottom: '10px',
                width: '100%'
              }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share on X (Twitter)
            </a>

            <button
              type="button"
              onClick={onClose}
              className="bmm-btn-secondary"
              style={{ width: '100%', padding: '9px 0', borderRadius: '9999px', border: '1px solid #d2d2d7', background: '#fff', fontSize: '13px', cursor: 'pointer' }}
            >
              Done & Return to Showcase
            </button>
          </div>
        ) : initialStatus === 'test_sandbox' ? (
          <div style={{ padding: '8px' }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontWeight: 600, fontSize: '14px' }}>
                <span>🧪 Test-Mode Sandbox Verification</span>
              </div>
              <p style={{ fontSize: '12px', color: '#3b82f6', marginTop: '6px', lineHeight: 1.5 }}>
                Live Razorpay merchant credentials are not configured in this development environment.
                The checkout session was securely registered in test mode.
              </p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', marginBottom: '16px' }}>
              <div><strong>Session ID:</strong> <code>{sessionId}</code></div>
              <div><strong>Order Status:</strong> Pending Verification</div>
              {orderDetails?.sponsorName && <div><strong>Sponsor:</strong> {orderDetails.sponsorName}</div>}
              {orderDetails?.spotId && <div><strong>Target Spot:</strong> #{orderDetails.spotId}</div>}
            </div>

            <button
              type="button"
              onClick={handleSimulateWebhook}
              disabled={isSimulating}
              className="bmm-btn-blue w-full"
              style={{ padding: '12px 0', fontSize: '13px', marginBottom: '10px' }}
            >
              {isSimulating ? 'Processing Simulated Webhook...' : 'Simulate Verified Webhook Delivery (Test Mode)'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bmm-btn-secondary w-full"
              style={{ padding: '8px 0', borderRadius: '9999px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', cursor: 'pointer' }}
            >
              Dismiss
            </button>
          </div>
        ) : initialStatus === 'cancelled' ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>ℹ️</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Checkout Cancelled</h3>
            <p style={{ fontSize: '13px', color: '#86868b', margin: '8px 0 16px' }}>
              Your checkout was cancelled. Any temporary spot reservations have been released.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bmm-btn-blue w-full"
              style={{ padding: '10px 0' }}
            >
              Return to Showcase
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Payment Awaiting Confirmation</h3>
            <p style={{ fontSize: '13px', color: '#86868b', margin: '8px 0 16px' }}>
              Your transaction is being confirmed by the payment network. Once verified, your sponsorship will appear immediately on the MacBook.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bmm-btn-secondary w-full"
              style={{ padding: '10px 0', borderRadius: '9999px', border: '1px solid #d2d2d7', background: '#fff', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
