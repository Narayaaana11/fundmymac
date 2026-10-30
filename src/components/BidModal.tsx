import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import { validateLogoFile } from '../server/payment/assetValidator';
import { loadRazorpayScript } from '../lib/checkoutApi';
import { submitSponsorshipEnquiry } from '../lib/enquiryApi';
import { IS_PUBLIC_PREVIEW } from '../config/previewConfig';
import type { DisplayCurrency } from './BrandMyMacNavbar';

interface BidModalProps {
  spot: BrandSpot | null;
  currency: DisplayCurrency;
  onClose: () => void;
  onBidPlaced?: (
    spotId: number,
    bidData: {
      brandName: string;
      websiteUrl: string;
      email: string;
      logoUrl?: string;
      bidAmount: number;
      depositAmount: number;
      currency: DisplayCurrency;
    }
  ) => void;
}

export const BidModal: React.FC<BidModalProps> = ({
  spot,
  currency,
  onClose,
  onBidPlaced
}) => {
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Currency specific floor & increments
  const currentTopBid = !spot
    ? 0
    : currency === 'INR'
    ? spot.topBidInr || Math.round(spot.topBidUsd * 84)
    : currency === 'EUR'
    ? spot.topBidEur
    : spot.topBidUsd;

  const minIncrement = currency === 'INR' ? 800 : 10;
  const minRequiredBid = spot && spot.bidCount > 0 ? currentTopBid + minIncrement : currentTopBid;

  const [bidAmount, setBidAmount] = useState<number>(minRequiredBid);

  // Sync bid amount when spot or currency changes without unneeded renders
  const prevSpotIdRef = useRef<number | null>(null);
  const prevCurrencyRef = useRef<string>(currency);

  useEffect(() => {
    if (spot && (prevSpotIdRef.current !== spot.id || prevCurrencyRef.current !== currency)) {
      prevSpotIdRef.current = spot.id;
      prevCurrencyRef.current = currency;
      const top =
        currency === 'INR'
          ? spot.topBidInr || Math.round(spot.topBidUsd * 84)
          : currency === 'EUR'
          ? spot.topBidEur
          : spot.topBidUsd;
      setBidAmount(spot.bidCount > 0 ? top + minIncrement : top);
    }
  }, [spot, currency, minIncrement]);

  const handleClose = useCallback(() => {
    setIsSuccess(false);
    setErrorMessage(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!spot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [spot, handleClose]);

  if (!spot) return null;

  // 20% deposit calculation (minimum $10 / 10 € / ₹800)
  const depositPercent = 0.2;
  const minDeposit = currency === 'INR' ? 800 : 10;
  const calculatedDeposit = Math.max(Math.round(bidAmount * depositPercent), minDeposit);

  const formatCurrency = (val: number) => {
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

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!brandName.trim()) {
      setErrorMessage('Please enter your company or brand name.');
      return;
    }

    if (!websiteUrl.trim() || !websiteUrl.includes('.')) {
      setErrorMessage('A valid website URL is required (e.g. https://yourstartup.com).');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid contact email is required to receive notification.');
      return;
    }

    setIsSubmitting(true);

    // Finding A & B Fix: In Public Preview mode, route directly to honest waitlist
    // Zero simulated payment, zero false state mutations, zero inventory locking
    if (IS_PUBLIC_PREVIEW) {
      try {
        const result = await submitSponsorshipEnquiry({
          name: brandName.trim(),
          email: email.trim(),
          websiteUrl: websiteUrl.trim(),
          preferredSpotId: spot.id,
          message: `Public preview waitlist expression for Spot #${spot.id} (${spot.name})`
        });

        if (!result.success) {
          setErrorMessage(result.error || 'Failed to submit waitlist registration. Please try again.');
          setIsSubmitting(false);
          return;
        }

        setIsSuccess(true);
        setIsSubmitting(false);
        return;
      } catch {
        setErrorMessage('Network connection error. Please try again shortly.');
        setIsSubmitting(false);
        return;
      }
    }

    // Live mode (only reached when IS_PUBLIC_PREVIEW === false and live keys present)
    if (bidAmount < minRequiredBid) {
      setErrorMessage(`Bid must be at least ${formatCurrency(minRequiredBid)} (Current top bid + minimum increment).`);
      setIsSubmitting(false);
      return;
    }

    try {
      const isScriptLoaded = await loadRazorpayScript();
      const testKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RAZORPAY_KEY_ID) || '';

      const depositMinorUnits = calculatedDeposit * 100;

      if (isScriptLoaded && window.Razorpay && testKey && !testKey.includes('placeholder') && !testKey.includes('preview')) {
        const rzp = new window.Razorpay({
          key: testKey,
          amount: depositMinorUnits,
          currency: currency.toUpperCase(),
          name: 'Fund My Mac · Auction Bid Deposit',
          description: `20% Deposit for Spot #${spot.id} (${spot.name})`,
          image: logoPreview || '/logo-small.png',
          order_id: '',
          handler: () => {
            if (onBidPlaced) {
              onBidPlaced(spot.id, {
                brandName: brandName.trim(),
                websiteUrl: websiteUrl.trim(),
                email: email.trim(),
                logoUrl: logoPreview || undefined,
                bidAmount,
                depositAmount: calculatedDeposit,
                currency
              });
            }
            setIsSubmitting(false);
            setIsSuccess(true);
          },
          prefill: {
            name: brandName.trim(),
            email: email.trim()
          },
          theme: {
            color: '#0071e3'
          }
        });
        rzp.open();
        setIsSubmitting(false);
      } else {
        setErrorMessage('Payment gateway is currently awaiting merchant verification. Please join the waitlist.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage('Payment gateway connection error. Please join the waitlist.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="bmm-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bid-modal-title"
    >
      <div className="bmm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
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
            Spot #{spot.id} · {spot.surface.toUpperCase()} · {IS_PUBLIC_PREVIEW ? 'PUBLIC PREVIEW' : '14-DAY AUCTION'}
          </span>
        </div>

        <h3 id="bid-modal-title" className="bmm-modal-title">
          {spot.name}
        </h3>
        <p className="bmm-modal-subtitle">
          {spot.size} · {spot.dimensions} ({spot.location})
        </p>

        {/* Current Bid Stats Grid */}
        <div className="bmm-modal-stats-grid">
          <div>
            <span className="bmm-modal-stat-label">
              {IS_PUBLIC_PREVIEW ? 'Pricing' : 'Current Top Bid'}
            </span>
            <span className="bmm-modal-stat-val tabular-nums" style={{ color: '#0071e3', fontSize: '15px' }}>
              {IS_PUBLIC_PREVIEW ? 'Pricing Coming Soon' : formatCurrency(currentTopBid)}
            </span>
          </div>
          <div>
            <span className="bmm-modal-stat-label">Availability</span>
            <span className="bmm-modal-stat-val tabular-nums" style={{ color: '#34c759' }}>
              {spot.isSold ? 'Reserved' : 'Open for Preview'}
            </span>
          </div>
          <div>
            <span className="bmm-modal-stat-label">Placement</span>
            <span className="bmm-modal-stat-val tabular-nums">
              {spot.surface === 'lid' ? 'Outer Aluminum Lid' : spot.surface === 'inside' ? 'Palm Rest Area' : 'Accessory'}
            </span>
          </div>
          <div>
            <span className="bmm-modal-stat-label">Sticker Duration</span>
            <span className="bmm-modal-stat-val" style={{ color: '#0071e3', fontWeight: 700 }}>
              Device Lifelong ♾️
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
        ) : isSuccess ? (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              You're on the Priority Waitlist!
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 16px' }}>
              Thank you for registering interest for <strong>Spot #{spot.id} ({spot.name})</strong>.
              Fund My Mac is in public preview while Razorpay merchant approval completes.
              We will notify <strong>{email}</strong> the moment bidding officially opens.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="bmm-btn-blue"
              style={{ padding: '10px 32px', fontSize: '14px', borderRadius: '980px' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleBidSubmit} className="bmm-outbid-form">
            {IS_PUBLIC_PREVIEW ? (
              <div
                style={{
                  background: 'rgba(0, 113, 227, 0.06)',
                  border: '1px solid rgba(0, 113, 227, 0.2)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  margin: '14px 0',
                  fontSize: '13px',
                  color: 'var(--ink)',
                  lineHeight: 1.5
                }}
              >
                ℹ️ <strong>Public Preview Active:</strong> Official pricing and checkout will go live once Razorpay merchant account approval completes. Register below to secure priority waitlist access for Spot #{spot.id}.
              </div>
            ) : (
              /* Live Bid Amount Input & 20% Deposit Calculator */
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.05), rgba(52, 199, 89, 0.05))',
                  border: '1px solid rgba(0, 113, 227, 0.2)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  margin: '14px 0'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                    Your Total Bid Amount: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
                    Min: {formatCurrency(minRequiredBid)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                    {currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '$'}
                  </span>
                  <input
                    type="number"
                    min={minRequiredBid}
                    step={minIncrement}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Number(e.target.value) || minRequiredBid)}
                    className="bmm-input-field"
                    style={{ fontSize: '18px', fontWeight: 700 }}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            {errorMessage && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #f87171',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  marginBottom: '12px'
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="bmm-form-label">
                Brand or Company Name: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Acme AI, Supabase, YourStartup"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="bmm-input-field"
                required
                disabled={isSubmitting}
                maxLength={60}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="bmm-form-label">
                Target Website URL: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="url"
                placeholder="https://yourcompany.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="bmm-input-field"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="bmm-form-label">
                Contact Email Address: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                placeholder="founder@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bmm-input-field"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Logo file upload */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="bmm-form-label">Brand Logo (Optional preview):</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="bmm-input-field"
                style={{ fontSize: '12px', padding: '6px' }}
                disabled={isSubmitting}
              />
              {logoError && <span style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '3px' }}>{logoError}</span>}
              {logoPreview && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'contain', border: '1px solid #e5e5ea' }}
                  />
                  <span style={{ fontSize: '11px', color: '#34c759' }}>Logo uploaded for preview</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #e5e5ea', paddingTop: '14px', marginTop: '14px' }}>
              <p style={{ fontSize: '11px', color: 'var(--ink-2)', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                {IS_PUBLIC_PREVIEW
                  ? '🔒 We respect your privacy. Enquiries are encrypted in our database under Row-Level Security and are never publicly accessible.'
                  : '🔒 If outbid, your deposit is automatically refunded in full. Winning bids settle remaining balance at campaign close.'}
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bmm-btn-blue"
                style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600 }}
              >
                {isSubmitting
                  ? 'Submitting...'
                  : IS_PUBLIC_PREVIEW
                  ? `Join Priority Waitlist for Spot #${spot.id} 🚀`
                  : `Place Bid Deposit (${formatCurrency(calculatedDeposit)}) 🚀`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
