import React, { useState, useEffect } from 'react';
import type { SponsorTier } from '../data/fundMyMacData';
import confetti from 'canvas-confetti';

interface DonationModalProps {
  isOpen: boolean;
  selectedTier: SponsorTier | null;
  currency: 'EUR' | 'USD';
  onClose: () => void;
  onConfirmDonation?: (amountUsd: number, amountEur: number, sponsorName: string, sponsorUrl: string) => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  selectedTier,
  currency,
  onClose,
  onConfirmDonation
}) => {
  const [customAmount, setCustomAmount] = useState<number>(
    selectedTier ? (currency === 'EUR' ? selectedTier.priceEur : selectedTier.priceUsd) : 50
  );
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorUrl, setSponsorUrl] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'applepay' | 'crypto' | 'upi'>('card');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (selectedTier) {
      const timer = setTimeout(() => {
        setCustomAmount(currency === 'EUR' ? selectedTier.priceEur : selectedTier.priceUsd);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedTier, currency]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const currencySymbol = currency === 'EUR' ? '€' : '$';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onConfirmDonation) {
      const amountUsd = currency === 'EUR' ? Math.round(customAmount * 1.09) : customAmount;
      const amountEur = currency === 'EUR' ? customAmount : Math.round(customAmount * 0.92);
      onConfirmDonation(amountUsd, amountEur, sponsorName.trim() || 'Anonymous Supporter', sponsorUrl.trim());
    }
    setIsSuccess(true);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="bmm-modal-overlay" onClick={onClose}>
      <div className="bmm-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="bmm-modal-close"
          aria-label="Close"
        >
          ✕
        </button>

        {!isSuccess ? (
          <>
            <div className="bmm-modal-header-badge">
              <span className="modal-pill-tag">
                {selectedTier ? `TIER: ${selectedTier.name.toUpperCase()}` : 'CUSTOM DONATION'}
              </span>
            </div>

            <h3 className="bmm-modal-title">
              {selectedTier ? `Sponsor as ${selectedTier.name}` : 'Support Fund My Mac'}
            </h3>
            <p className="bmm-modal-subtitle">
              Help us fund the MacBook Pro 16″ (Apple M5 Max / M5 Pro) to build and ship VESPER. With no budget limit, all surplus funds fuel startup GPU compute and roadshows!
            </p>

            <form onSubmit={handleSubmit} className="bmm-donation-form">
              {/* Quick Amount Chips */}
              <div className="donation-amount-section">
                <label className="bmm-form-label">Contribution Amount ({currencySymbol}):</label>
                <div className="quick-amount-chips">
                  {[25, 50, 150, 250, 500, 1500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomAmount(amt)}
                      className={`amount-chip ${customAmount === amt ? 'active' : ''}`}
                    >
                      {amt} {currencySymbol}
                    </button>
                  ))}
                </div>

                <div className="custom-amt-input-wrap">
                  <span className="curr-sym">{currencySymbol}</span>
                  <input
                    type="number"
                    min="5"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(Math.max(5, Number(e.target.value)))}
                    className="custom-amt-field"
                    required
                  />
                </div>
              </div>

              {/* Sponsor Information */}
              <div className="sponsor-info-fields">
                <div className="form-group">
                  <label className="bmm-form-label">Company or Backer Name:</label>
                  <input
                    type="text"
                    placeholder="e.g. Supabase, Acme AI, or Vincent"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    className="bmm-input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="bmm-form-label">Website or Social Link:</label>
                  <input
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={sponsorUrl}
                    onChange={(e) => setSponsorUrl(e.target.value)}
                    className="bmm-input-field"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div className="payment-method-selector">
                <label className="bmm-form-label">Payment Option:</label>
                <div className="payment-options-grid">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`pay-option ${paymentMethod === 'card' ? 'active' : ''}`}
                  >
                    💳 Stripe / Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('applepay')}
                    className={`pay-option ${paymentMethod === 'applepay' ? 'active' : ''}`}
                  >
                    🍏 Apple Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('crypto')}
                    className={`pay-option ${paymentMethod === 'crypto' ? 'active' : ''}`}
                  >
                    🪙 Crypto / Web3
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`pay-option ${paymentMethod === 'upi' ? 'active' : ''}`}
                  >
                    🇮🇳 UPI Transfer
                  </button>
                </div>

                {/* Stripe Checkout Link Option */}
                {(paymentMethod === 'card' || paymentMethod === 'applepay') && (
                  <div style={{ background: '#f5f5f7', padding: '10px 12px', borderRadius: '8px', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e5e5ea' }}>
                    <div style={{ fontSize: '11px', color: '#1d1d1f' }}>
                      <strong>Instant Stripe Checkout:</strong>
                      <span style={{ display: 'block', color: '#86868b' }}>Pay via credit card or Apple Pay.</span>
                    </div>
                    <a
                      href={import.meta.env.VITE_STRIPE_PAYMENT_LINK || 'https://buy.stripe.com/'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bmm-btn-blue"
                      style={{ fontSize: '11px', padding: '6px 12px', background: '#635bff', whiteSpace: 'nowrap', textDecoration: 'none' }}
                    >
                      Open Stripe ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Summary & Submit */}
              <div className="donation-total-summary">
                <span>Total to Fund:</span>
                <strong>{customAmount.toLocaleString()} {currencySymbol}</strong>
              </div>

              <button type="submit" className="bmm-btn-blue w-full">
                Confirm & Back Fund My Mac ({customAmount.toLocaleString()} {currencySymbol})
              </button>
            </form>
          </>
        ) : (
          /* Success Screen */
          <div className="bmm-modal-success-box">
            <div className="bmm-success-icon-ring">✓</div>
            <h3 className="bmm-modal-title" style={{ marginTop: '16px' }}>
              Thank You for Backing Us!
            </h3>
            <p className="bmm-modal-subtitle" style={{ maxWidth: '400px', margin: '8px auto 16px auto' }}>
              Your sponsorship of <strong>{customAmount.toLocaleString()} {currencySymbol}</strong> for <strong>{sponsorName || 'your company'}</strong> has been recorded! Your logo and website are now queued for the official Sponsors Wall and MacBook Pro roadshow.
            </p>

            {/* Viral Share on X (Twitter) Button */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `I just backed Fund My Mac & @VESPER to power the founder roadshow and build the future of AI! 💖 Check it out:`
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
                width: '100%',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
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
              Done & Return to MacBook
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
