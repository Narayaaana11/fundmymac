import React, { useState, useEffect, useRef } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import { initiateCheckoutSession, loadRazorpayScript, verifyRazorpayPayment } from '../lib/checkoutApi';
import { validateLogoFile } from '../server/payment/assetValidator';

import type { DisplayCurrency } from './BrandMyMacNavbar';

interface BidModalProps {
  spot: BrandSpot | null;
  currency: DisplayCurrency;
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
  onClose
}) => {
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!spot) return null;

  const currentBid = currency === 'INR' ? (spot.topBidInr || Math.round(spot.topBidUsd * 84)) : currency === 'EUR' ? spot.topBidEur : spot.topBidUsd;

  const formatPriceVal = (val: number) => {
    if (currency === 'INR') return `₹${val.toLocaleString('en-IN')}`;
    if (currency === 'EUR') return `${val.toLocaleString()} €`;
    return `$${val.toLocaleString()}`;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateLogoFile(file);
    if (!validation.valid) {
      setLogoError(validation.error || 'Invalid logo file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoPreview(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!brandName.trim()) {
      setErrorMessage('Please enter your company or brand name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid contact email is required for sticker proof approval.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await initiateCheckoutSession({
        orderType: 'spot_sponsorship',
        spotId: spot.id,
        currency: currency.toLowerCase() as 'inr' | 'usd' | 'eur',
        sponsorName: brandName.trim(),
        sponsorUrl: websiteUrl.trim() || undefined,
        sponsorEmail: email.trim(),
        logoUrl: logoPreview || undefined
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to initialize secure checkout. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // If test mode sandbox fallback
      if (result.isTestMode && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      // Official Razorpay Standard Checkout Modal
      if (result.razorpayOrderId && result.keyId) {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || !window.Razorpay) {
          setErrorMessage('Failed to load Razorpay Checkout SDK. Please check your network connection.');
          setIsSubmitting(false);
          return;
        }

        const rzp = new window.Razorpay({
          key: result.keyId,
          amount: result.amountMinor || result.amountCents || currentBid * 100,
          currency: (result.currency || currency).toUpperCase(),
          name: 'Fund My Mac / VESPER',
          description: `Sticker Spot #${spot.id} (${spot.name})`,
          order_id: result.razorpayOrderId,
          prefill: {
            name: brandName.trim(),
            email: email.trim()
          },
          theme: { color: '#0071e3' },
          handler: async (response) => {
            const verifyRes = await verifyRazorpayPayment({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
              orderId: result.orderId
            });

            if (verifyRes.success && verifyRes.verified) {
              window.location.href = `/?session_id=${encodeURIComponent(response.razorpay_order_id)}&status=success`;
            } else {
              setErrorMessage(verifyRes.error || 'Payment signature verification failed.');
              setIsSubmitting(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsSubmitting(false);
            }
          }
        });

        rzp.open();
        return;
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error during checkout';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bmm-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="bid-modal-title">
      <div className="bmm-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="bmm-modal-close"
          aria-label="Close dialog"
          disabled={isSubmitting}
        >
          ✕
        </button>

        <div className="bmm-modal-header-badge">
          <span className="modal-pill-tag">
            Spot #{spot.id} · {spot.surface.toUpperCase()}
          </span>
        </div>

        <h3 id="bid-modal-title" className="bmm-modal-title">{spot.name}</h3>
        <p className="bmm-modal-subtitle">
          {spot.size} · {spot.dimensions} ({spot.location})
        </p>

        <div className="bmm-modal-stats-grid">
          <div>
            <span className="bmm-modal-stat-label">Sponsorship Price</span>
            <span className="bmm-modal-stat-val" style={{ color: 'var(--blue)' }}>
              {currency === 'INR' ? `₹${currentBid.toLocaleString('en-IN')}` : currency === 'EUR' ? `${currentBid.toLocaleString()} €` : `$${currentBid.toLocaleString()}`}
            </span>
          </div>
          <div>
            <span className="bmm-modal-stat-label">Status</span>
            <span className="bmm-modal-stat-val" style={{ color: spot.isSold ? 'var(--ink)' : '#27ae60' }}>
              {spot.isSold ? 'Sponsored (Permanent)' : 'Available to Claim'}
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
          <div className="bmm-modal-sponsor-box" style={{ marginTop: '16px', background: '#f5f5f7', padding: '16px', borderRadius: '12px', border: '1px solid #e5e5ea' }}>
            <span className="bmm-sponsor-label-title" style={{ fontSize: '12px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmed Sponsor:</span>
            <p className="bmm-sponsor-name-highlight" style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0', color: '#1d1d1f' }}>{spot.sponsorName}</p>
            {spot.sponsorUrl && (
              <a
                href={spot.sponsorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bmm-modal-btn-visit"
                style={{ display: 'inline-block', fontSize: '13px', color: '#0071e3', textDecoration: 'none', fontWeight: 600, marginTop: '4px' }}
              >
                Visit Sponsor Website ↗
              </a>
            )}
            <p style={{ fontSize: '12px', color: '#86868b', marginTop: '12px', borderTop: '1px solid #e5e5ea', paddingTop: '8px' }}>
              This spot is permanently locked for the lifetime of this machine. To sponsor another position, please choose an open spot from the showcase.
            </p>
          </div>
        ) : (
          /* Secure Verified Checkout Form */
          <form onSubmit={handleCheckoutSubmit} className="bmm-outbid-form">
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '14px 0 8px' }}>
              Claim This Spot For Your Brand
            </h4>

            {errorMessage && (
              <div className="bmm-error-banner" style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
                ⚠️ {errorMessage}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="bmm-form-label">Brand / Company Name: <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                placeholder="e.g. Supabase, Cursor, Linear, or Your Startup"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="bmm-input-field"
                required
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="bmm-form-label">Contact Email (for sticker proof approval): <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="email"
                placeholder="founder@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bmm-input-field"
                required
                disabled={isSubmitting}
              />
              <span style={{ fontSize: '11px', color: 'var(--ink-2)', display: 'block', marginTop: '3px' }}>
                🔒 Your email is private and will never be shared publicly.
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="bmm-form-label">Website or Social URL:</label>
              <input
                type="url"
                placeholder="https://yourcompany.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="bmm-input-field"
                disabled={isSubmitting}
              />
            </div>

            {/* Logo Upload Option with Validation */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="bmm-form-label">Upload Brand Logo Sticker (Optional):</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                style={{ display: 'none' }}
                disabled={isSubmitting}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bmm-btn-blue"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                  disabled={isSubmitting}
                >
                  {logoPreview ? 'Change Logo' : 'Upload Logo (PNG, SVG, WebP · Max 2MB)'}
                </button>
                {logoPreview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      style={{ height: '32px', maxWidth: '60px', objectFit: 'contain', background: '#f5f5f7', padding: '2px', borderRadius: '4px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#16a34a' }}>✓ Ready</span>
                  </div>
                )}
              </div>
              {logoError && (
                <span style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '4px' }}>
                  ❌ {logoError}
                </span>
              )}
            </div>

            <div style={{ background: '#f5f5f7', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px', color: '#1d1d1f', border: '1px solid #e5e5ea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Canonical Placement Amount:</span>
                <strong>{formatPriceVal(currentBid)}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#86868b' }}>
                Payment is processed securely via Razorpay (UPI, Cards, NetBanking). Spot #{spot.id} will be held exclusively for you during checkout.
              </div>
            </div>

            <button
              type="submit"
              className="bmm-btn-blue w-full"
              style={{ padding: '12px 0', fontSize: '14px', opacity: isSubmitting ? 0.7 : 1 }}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Securing Reservation & Loading Checkout...'
                : `Proceed to Secure Checkout · ${formatPriceVal(currentBid)}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
