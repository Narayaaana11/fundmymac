import React, { useState, useEffect, useRef } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import { validateLogoFile } from '../server/payment/assetValidator';
import { loadRazorpayScript } from '../lib/checkoutApi';
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

  // Sync bid amount when spot or currency changes
  useEffect(() => {
    if (spot) {
      const top =
        currency === 'INR'
          ? spot.topBidInr || Math.round(spot.topBidUsd * 84)
          : currency === 'EUR'
          ? spot.topBidEur
          : spot.topBidUsd;
      setBidAmount(spot.bidCount > 0 ? top + minIncrement : top);
    }
  }, [spot, currency, minIncrement]);

  useEffect(() => {
    if (!spot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [spot, onClose]);

  if (!spot) return null;

  // 20% deposit calculation (minimum $10 / 10 € / ₹800)
  const depositPercent = 0.2;
  const minDeposit = currency === 'INR' ? 800 : 10;
  const calculatedDeposit = Math.max(Math.round(bidAmount * depositPercent), minDeposit);
  const remainingBalance = Math.max(bidAmount - calculatedDeposit, 0);

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

    if (bidAmount < minRequiredBid) {
      setErrorMessage(`Bid must be at least ${formatCurrency(minRequiredBid)} (Current top bid + minimum increment).`);
      return;
    }

    if (!brandName.trim()) {
      setErrorMessage('Please enter your company or brand name.');
      return;
    }

    if (!websiteUrl.trim() || !websiteUrl.includes('.')) {
      setErrorMessage('A valid website URL is required (e.g. https://yourstartup.com).');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid contact email is required to receive outbid alerts and final settlement links.');
      return;
    }

    setIsSubmitting(true);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      const testKey =
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RAZORPAY_KEY_ID) ||
        'rzp_test_public_preview';

      const depositMinorUnits = currency === 'INR' ? calculatedDeposit * 100 : calculatedDeposit * 100;

      if (isScriptLoaded && window.Razorpay && testKey && !testKey.includes('public_preview')) {
        // Live Razorpay popup for 20% deposit
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
      } else {
        // Test Mode Simulation: instant successful bid confirmation
        setTimeout(() => {
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
        }, 800);
      }
    } catch {
      setErrorMessage('Payment gateway connection error. Please try again.');
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
            Spot #{spot.id} · {spot.surface.toUpperCase()} · 14-DAY AUCTION
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
            <span className="bmm-modal-stat-label">Current Top Bid</span>
            <span className="bmm-modal-stat-val tabular-nums" style={{ color: '#34c759' }}>
              {formatCurrency(currentTopBid)}
            </span>
          </div>
          <div>
            <span className="bmm-modal-stat-label">Total Bids Placed</span>
            <span className="bmm-modal-stat-val tabular-nums">
              {spot.bidCount} {spot.bidCount === 1 ? 'bid' : 'bids'}
            </span>
          </div>
          <div>
            <span className="bmm-modal-stat-label">Min. Increment</span>
            <span className="bmm-modal-stat-val tabular-nums" style={{ color: 'var(--blue)' }}>
              +{formatCurrency(minIncrement)}
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
              Your Bid is Officially Placed!
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 16px' }}>
              You are now the leading bidder for <strong>Spot #{spot.id}</strong> at{' '}
              <strong style={{ color: '#34c759' }}>{formatCurrency(bidAmount)}</strong>.
            </p>

            <div
              style={{
                background: '#f5f5f7',
                borderRadius: '12px',
                padding: '14px 18px',
                textAlign: 'left',
                margin: '0 auto 20px',
                border: '1px solid #e5e5ea',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--ink-2)' }}>20% Deposit Paid:</span>
                <strong style={{ color: 'var(--ink)' }}>{formatCurrency(calculatedDeposit)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--ink-2)' }}>Remaining Balance if Won:</span>
                <strong style={{ color: 'var(--ink)' }}>{formatCurrency(remainingBalance)}</strong>
              </div>
              <div style={{ borderTop: '1px solid #e5e5ea', paddingTop: '8px', color: '#0071e3', fontSize: '11px' }}>
                🛡️ If outbid, your {formatCurrency(calculatedDeposit)} deposit is automatically refunded to your card.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="bmm-btn-blue"
              style={{ padding: '10px 32px', fontSize: '14px' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleBidSubmit} className="bmm-outbid-form">
            {/* Bid Amount Input & 20% Deposit Calculator */}
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
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
                  {currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '$'}
                </span>
                <input
                  type="number"
                  min={minRequiredBid}
                  step={currency === 'INR' ? 100 : 5}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value) || 0)}
                  className="bmm-input-field tabular-nums"
                  style={{ fontSize: '18px', fontWeight: 700, padding: '8px 12px' }}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* 20% Deposit Breakdown */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                  fontSize: '12px'
                }}
              >
                <div>
                  <span style={{ color: 'var(--ink-2)', display: 'block' }}>20% Deposit Due Now:</span>
                  <strong style={{ color: 'var(--blue)', fontSize: '14px' }} className="tabular-nums">
                    {formatCurrency(calculatedDeposit)}
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--ink-2)', display: 'block' }}>Balance if Won:</span>
                  <strong style={{ color: 'var(--ink)', fontSize: '14px' }} className="tabular-nums">
                    {formatCurrency(remainingBalance)}
                  </strong>
                </div>
              </div>
            </div>

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
                Brand / Sponsor Name: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Supabase, Cursor, CleanMyMac"
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
                placeholder="https://yourbrand.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="bmm-input-field"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="bmm-form-label">
                Contact Email: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                placeholder="founder@yourbrand.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bmm-input-field"
                required
                disabled={isSubmitting}
              />
              <span style={{ fontSize: '11px', color: 'var(--ink-2)', display: 'block', marginTop: '2px' }}>
                Used for instant outbid alerts and winning settlement links. Never shared publicly.
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="bmm-form-label">Brand Logo (PNG, SVG, JPG):</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="bmm-input-field"
                style={{ fontSize: '12px', padding: '6px' }}
                disabled={isSubmitting}
              />
              {logoError && (
                <span style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                  {logoError}
                </span>
              )}
              {logoPreview && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    style={{ width: '40px', height: '24px', objectFit: 'contain', border: '1px solid #e5e5ea', borderRadius: '4px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#34c759' }}>Logo ready for sticker print</span>
                </div>
              )}
            </div>

            {/* Outbid Refund Guarantee */}
            <div
              style={{
                background: '#f5f5f7',
                border: '1px solid #e5e5ea',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '11px',
                color: 'var(--ink-2)',
                lineHeight: 1.4,
                marginBottom: '14px'
              }}
            >
              🛡️ <strong>BrandMyMac Guarantee:</strong> You only pay the 20% deposit ({formatCurrency(calculatedDeposit)}) now. If someone outbids you, your deposit is <strong>automatically refunded in full</strong>. If you win at auction end, your deposit counts toward the total and you pay the remaining balance.
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bmm-btn-blue"
              style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600 }}
            >
              {isSubmitting
                ? 'Processing Deposit...'
                : `Place Bid with 20% Deposit (${formatCurrency(calculatedDeposit)}) 🚀`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
