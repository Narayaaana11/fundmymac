import React, { useState, useEffect } from 'react';
import type { SponsorTier } from '../data/fundMyMacData';
import { initiateCheckoutSession } from '../lib/checkoutApi';

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
  onClose
}) => {
  const [customAmount, setCustomAmount] = useState<number>(50);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorEmail, setSponsorEmail] = useState('');
  const [sponsorUrl, setSponsorUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const effectiveAmount = selectedTier
    ? (currency === 'EUR' ? selectedTier.priceEur : selectedTier.priceUsd)
    : customAmount;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const currencySymbol = currency === 'EUR' ? '€' : '$';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!sponsorName.trim()) {
      setErrorMessage('Please provide your name or company name.');
      return;
    }

    if (!sponsorEmail.trim() || !sponsorEmail.includes('@')) {
      setErrorMessage('A valid email address is required for donation receipt.');
      return;
    }

    if (!selectedTier && customAmount < 5) {
      setErrorMessage('Minimum contribution is 5 ' + currencySymbol);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await initiateCheckoutSession({
        orderType: selectedTier ? 'tier_sponsorship' : 'custom_donation',
        tierId: selectedTier?.id,
        customAmountCents: selectedTier ? undefined : customAmount * 100,
        currency: currency.toLowerCase() as 'usd' | 'eur',
        sponsorName: sponsorName.trim(),
        sponsorEmail: sponsorEmail.trim(),
        sponsorUrl: sponsorUrl.trim() || undefined
      });

      if (!result.success || !result.checkoutUrl) {
        setErrorMessage(result.error || 'Failed to initialize secure checkout. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Redirect to provider checkout
      window.location.href = result.checkoutUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error during checkout';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bmm-modal-overlay" onClick={onClose}>
      <div className="bmm-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="bmm-modal-close"
          aria-label="Close"
          disabled={isSubmitting}
        >
          ✕
        </button>

        <div className="bmm-modal-header-badge">
          <span className="modal-pill-tag">
            {selectedTier ? `TIER: ${selectedTier.name.toUpperCase()}` : 'BACKER CONTRIBUTION'}
          </span>
        </div>

        <h3 className="bmm-modal-title">
          {selectedTier ? `Sponsor as ${selectedTier.name}` : 'Support Fund My Mac'}
        </h3>
        <p className="bmm-modal-subtitle">
          Help us fund the MacBook Pro 16″ (Apple M5 Max / M5 Pro) to build and ship VESPER. 100% of all contributions fuel developer roadshows and AI compute.
        </p>

        {errorMessage && (
          <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', margin: '10px 0' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bmm-donation-form">
          {/* Quick Amount Chips (Only for Custom Donation) */}
          {!selectedTier && (
            <div className="donation-amount-section">
              <label className="bmm-form-label">Contribution Amount ({currencySymbol}):</label>
              <div className="quick-amount-chips">
                {[25, 50, 100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomAmount(amt)}
                    className={`amount-chip ${customAmount === amt ? 'active' : ''}`}
                    disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {selectedTier && (
            <div style={{ background: '#f5f5f7', padding: '12px', borderRadius: '8px', margin: '12px 0', border: '1px solid #e5e5ea' }}>
              <span style={{ fontSize: '11px', color: '#86868b', textTransform: 'uppercase' }}>Selected Tier Amount:</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--blue)' }}>
                {effectiveAmount.toLocaleString()} {currencySymbol}
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="bmm-form-label">Backer Name or Organization: <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              placeholder="e.g. Satoshi Nakamoto or Acme Corp"
              value={sponsorName}
              onChange={(e) => setSponsorName(e.target.value)}
              className="bmm-input-field"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="bmm-form-label">Contact Email (for payment receipt & private updates): <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="email"
              placeholder="you@domain.com"
              value={sponsorEmail}
              onChange={(e) => setSponsorEmail(e.target.value)}
              className="bmm-input-field"
              required
              disabled={isSubmitting}
            />
            <span style={{ fontSize: '11px', color: 'var(--ink-2)', display: 'block', marginTop: '3px' }}>
              🔒 Kept private. Never displayed on the public sponsors wall.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="bmm-form-label">Website or Profile Link (Optional):</label>
            <input
              type="url"
              placeholder="https://x.com/yourhandle or https://company.com"
              value={sponsorUrl}
              onChange={(e) => setSponsorUrl(e.target.value)}
              className="bmm-input-field"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="bmm-btn-blue w-full"
            style={{ padding: '13px 0', fontSize: '14px', opacity: isSubmitting ? 0.7 : 1 }}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Opening Secure Stripe Checkout...'
              : `Proceed to Pay ${effectiveAmount.toLocaleString()} ${currencySymbol}`}
          </button>
        </form>
      </div>
    </div>
  );
};
