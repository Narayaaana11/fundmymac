import React, { useState, useEffect, useRef } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import confetti from 'canvas-confetti';

interface BidModalProps {
  spot: BrandSpot | null;
  currency: 'EUR' | 'USD';
  onClose: () => void;
  onConfirmBid?: (
    spotId: number,
    brandName: string,
    websiteUrl: string,
    logoUrl?: string,
    amountUsd?: number,
    amountEur?: number
  ) => void;
}

export const BidModal: React.FC<BidModalProps> = ({
  spot,
  currency,
  onClose,
  onConfirmBid
}) => {
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [paymentOption, setPaymentOption] = useState<'card' | 'applepay' | 'paypal' | 'crypto'>('card');
  const [isSuccessBid, setIsSuccessBid] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!spot) return null;

  const currentBid = currency === 'EUR' ? spot.topBidEur : spot.topBidUsd;
  const currencySymbol = currency === 'EUR' ? '€' : '$';

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    if (onConfirmBid) {
      onConfirmBid(
        spot.id,
        brandName.trim(),
        websiteUrl.trim() || 'https://x.com',
        logoPreview || spot.logoUrl,
        spot.topBidUsd,
        spot.topBidEur
      );
    }

    setIsSuccessBid(true);

    confetti({
      particleCount: 110,
      spread: 75,
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

        {!isSuccessBid ? (
          <>
            <div className="bmm-modal-header-badge">
              <span className="modal-pill-tag">
                Spot #{spot.id} · {spot.surface.toUpperCase()}
              </span>
            </div>

            <h3 className="bmm-modal-title">{spot.name}</h3>
            <p className="bmm-modal-subtitle">
              {spot.size} · {spot.dimensions} ({spot.location})
            </p>

            <div className="bmm-modal-stats-grid">
              <div>
                <span className="bmm-modal-stat-label">Sponsorship Price</span>
                <span className="bmm-modal-stat-val" style={{ color: 'var(--blue)' }}>
                  {currentBid.toLocaleString()} {currencySymbol}
                </span>
              </div>
              <div>
                <span className="bmm-modal-stat-label">Status</span>
                <span className="bmm-modal-stat-val" style={{ color: spot.isSold ? 'var(--ink)' : '#27ae60' }}>
                  {spot.isSold ? 'Sponsored' : 'Available to Claim'}
                </span>
              </div>
              <div>
                <span className="bmm-modal-stat-label">Duration</span>
                <span className="bmm-modal-stat-val" style={{ color: '#0071e3', fontWeight: 700 }}>
                  Device Lifelong ♾️
                </span>
              </div>
              <div>
                <span className="bmm-modal-stat-label">Vinyl Sticker</span>
                <span className="bmm-modal-stat-val">
                  3M Matte UV-Proof
                </span>
              </div>
            </div>

            {spot.isSold ? (
              <div className="bmm-modal-sponsor-box">
                <span className="bmm-sponsor-label-title">Current Sponsor:</span>
                <p className="bmm-sponsor-name-highlight">{spot.sponsorName}</p>
                {spot.sponsorUrl && (
                  <a
                    href={spot.sponsorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bmm-modal-btn-visit"
                  >
                    Visit Sponsor Website ↗
                  </a>
                )}
              </div>
            ) : null}

            {/* Real Checkout & Sponsor Claim Form */}
            <form onSubmit={handleClaimSubmit} className="bmm-outbid-form">
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', margin: '8px 0 4px' }}>
                {spot.isSold ? 'Outbid / Replace Spot Sponsorship' : 'Claim This Spot For Your Brand'}
              </h4>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="bmm-form-label">Brand / Company Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Supabase, Cursor, Linear, or Your Startup"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="bmm-input-field"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="bmm-form-label">Website or Social Link:</label>
                <input
                  type="url"
                  placeholder="https://yourcompany.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="bmm-input-field"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="bmm-form-label">Contact Email (for sticker proof approval):</label>
                <input
                  type="email"
                  placeholder="founder@yourcompany.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bmm-input-field"
                  required
                />
              </div>

              {/* Logo Upload Option */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="bmm-form-label">Upload Brand Logo Sticker:</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bmm-btn-blue"
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                  >
                    {logoPreview ? 'Change Logo' : 'Upload Logo PNG / SVG'}
                  </button>
                  {logoPreview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        style={{ height: '32px', maxWidth: '60px', objectFit: 'contain', background: '#f5f5f7', padding: '2px', borderRadius: '4px' }}
                      />
                      <span style={{ fontSize: '11px', color: '#16a34a' }}>✓ Ready for sticker</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment / Pledge Preference */}
              <div style={{ marginBottom: '16px' }}>
                <label className="bmm-form-label">Payment / Checkout Preference:</label>
                <div className="payment-options-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentOption('card')}
                    className={`pay-option ${paymentOption === 'card' ? 'active' : ''}`}
                    style={{ fontSize: '11px', padding: '8px 4px' }}
                  >
                    💳 Stripe
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentOption('applepay')}
                    className={`pay-option ${paymentOption === 'applepay' ? 'active' : ''}`}
                    style={{ fontSize: '11px', padding: '8px 4px' }}
                  >
                    🍏 Apple
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentOption('paypal')}
                    className={`pay-option ${paymentOption === 'paypal' ? 'active' : ''}`}
                    style={{ fontSize: '11px', padding: '8px 4px' }}
                  >
                    🅿️ PayPal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentOption('crypto')}
                    className={`pay-option ${paymentOption === 'crypto' ? 'active' : ''}`}
                    style={{ fontSize: '11px', padding: '8px 4px' }}
                  >
                    🪙 Crypto
                  </button>
                </div>

                {/* Stripe Checkout Link Option */}
                {(paymentOption === 'card' || paymentOption === 'applepay') && (
                  <div style={{ background: '#f5f5f7', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e5e5ea' }}>
                    <div style={{ fontSize: '11px', color: '#1d1d1f' }}>
                      <strong>Instant Stripe Checkout:</strong>
                      <span style={{ display: 'block', color: '#86868b' }}>Pay securely via card, Apple Pay or bank.</span>
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

              <button type="submit" className="bmm-btn-blue w-full" style={{ padding: '12px 0', fontSize: '14px' }}>
                Confirm & Secure Spot #{spot.id} · {currentBid.toLocaleString()} {currencySymbol}
              </button>
            </form>
          </>
        ) : (
          /* Success Screen */
          <div className="bmm-modal-success-box">
            <div className="bmm-success-icon-ring">✓</div>
            <h3 className="bmm-modal-title" style={{ marginTop: '14px' }}>
              Spot #{spot.id} Secured!
            </h3>
            <p className="bmm-modal-subtitle" style={{ maxWidth: '400px', margin: '8px auto 16px auto' }}>
              Congratulations <strong>{brandName}</strong>! Your sponsorship of Spot #{spot.id} ({currentBid.toLocaleString()} {currencySymbol}) has been recorded for the <strong>device lifelong</strong> duration. Your sticker is now queued for the MacBook Pro IRL founder roadshow!
            </p>

            {/* Viral Share on X (Twitter) Button */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `We just secured Spot #${spot.id} (${spot.name}) on the @VESPER MacBook Pro for the global founder roadshow! 🚀 Check out the machine & get your brand on it:`
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
              Share Sponsorship on X (Twitter)
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
        )}
      </div>
    </div>
  );
};
