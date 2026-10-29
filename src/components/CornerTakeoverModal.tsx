import React, { useState, useEffect, useRef } from 'react';
import type { DisplayCurrency } from './BrandMyMacNavbar';
import type { CornerState } from '../data/fundMyMacData';
import { validateLogoFile } from '../server/payment/assetValidator';
import { loadRazorpayScript } from '../lib/checkoutApi';

interface CornerTakeoverModalProps {
  isOpen: boolean;
  currency: DisplayCurrency;
  cornerData: CornerState;
  onClose: () => void;
  onTakeoverSuccess: (newSponsor: {
    brandName: string;
    websiteUrl: string;
    avatarUrl: string;
    amountUsd: number;
    amountInr: number;
    amountEur: number;
  }) => void;
}

export const CornerTakeoverModal: React.FC<CornerTakeoverModalProps> = ({
  isOpen,
  currency,
  cornerData,
  onClose,
  onTakeoverSuccess
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
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentPriceFormatted =
    currency === 'INR'
      ? `₹${cornerData.amountInr.toLocaleString('en-IN')}`
      : currency === 'EUR'
      ? `${cornerData.amountEur} €`
      : `$${cornerData.amountUsd}`;

  const nextPriceFormatted =
    currency === 'INR'
      ? `₹${cornerData.nextBidInr.toLocaleString('en-IN')}`
      : currency === 'EUR'
      ? `${cornerData.nextBidEur} €`
      : `$${cornerData.nextBidUsd}`;

  const nextPriceAmount =
    currency === 'INR'
      ? cornerData.nextBidInr
      : currency === 'EUR'
      ? cornerData.nextBidEur
      : cornerData.nextBidUsd;

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

  const handleCornerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!brandName.trim()) {
      setErrorMessage('Please enter your brand or company name.');
      return;
    }

    if (!websiteUrl.trim() || !websiteUrl.includes('.')) {
      setErrorMessage('Please enter a valid website URL (e.g. https://yourstartup.com).');
      return;
    }

    setIsSubmitting(true);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      const testKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RAZORPAY_KEY_ID) || 'rzp_test_public_preview';

      if (isScriptLoaded && window.Razorpay && testKey && !testKey.includes('public_preview')) {
        // Open live Razorpay modal
        const rzp = new window.Razorpay({
          key: testKey,
          amount: nextPriceAmount * 100,
          currency: currency.toUpperCase(),
          name: 'Fund My Mac · The Corner',
          description: `Claim Corner Space for ${nextPriceFormatted}`,
          image: logoPreview || '/logo-small.png',
          order_id: '',
          handler: () => {
            onTakeoverSuccess({
              brandName: brandName.trim(),
              websiteUrl: websiteUrl.trim(),
              avatarUrl: logoPreview || '/logo-small.png',
              amountUsd: cornerData.nextBidUsd,
              amountInr: cornerData.nextBidInr,
              amountEur: cornerData.nextBidEur
            });
            onClose();
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
        // Test mode simulation: Instant successful takeover
        setTimeout(() => {
          onTakeoverSuccess({
            brandName: brandName.trim(),
            websiteUrl: websiteUrl.trim(),
            avatarUrl: logoPreview || '/logo-small.png',
            amountUsd: cornerData.nextBidUsd,
            amountInr: cornerData.nextBidInr,
            amountEur: cornerData.nextBidEur
          });
          setIsSubmitting(false);
          onClose();
        }, 800);
      }
    } catch {
      setErrorMessage('Checkout failed to launch. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="bmm-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="corner-modal-title"
    >
      <div className="bmm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
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
          <span className="modal-pill-tag">🔥 THE CORNER TAKEOVER</span>
        </div>

        <h3 id="corner-modal-title" className="bmm-modal-title">
          Claim The Corner Spot
        </h3>
        <p className="bmm-modal-subtitle">
          Display your brand on every page view at the top-left of the screen.
        </p>

        {/* Current vs Next Price Card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            background: '#f5f5f7',
            padding: '12px 16px',
            borderRadius: '12px',
            margin: '16px 0',
            border: '1px solid #e5e5ea'
          }}
        >
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-2)', fontWeight: 600 }}>
              Current Sponsor ({cornerData.currentSponsor})
            </span>
            <span style={{ display: 'block', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
              {currentPriceFormatted}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--blue)', fontWeight: 600 }}>
              Takeover Price (+{currency === 'INR' ? '₹800' : '$10'})
            </span>
            <span style={{ display: 'block', fontSize: '18px', fontWeight: 700, color: '#34c759' }}>
              {nextPriceFormatted}
            </span>
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

        <form onSubmit={handleCornerSubmit} className="bmm-outbid-form">
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="bmm-form-label">
              Brand / Sponsor Name: <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Inc, Supabase, YourApp"
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
              Contact Email: <span style={{ color: '#ef4444' }}>*</span>
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
            <label className="bmm-form-label">Brand Icon / Avatar (PNG, JPG, SVG):</label>
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
                  alt="Avatar preview"
                  style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain', border: '1px solid #e5e5ea' }}
                />
                <span style={{ fontSize: '11px', color: '#34c759' }}>Avatar ready for corner</span>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #e5e5ea', paddingTop: '14px', marginTop: '12px' }}>
            <p style={{ fontSize: '11px', color: 'var(--ink-2)', lineHeight: 1.4, margin: '0 0 12px 0' }}>
              🔒 Outbidding replaces the current sponsor at the top corner of the site. When someone outbids you later, you remain permanently listed in the "Previously here" history log.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bmm-btn-blue"
              style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600 }}
            >
              {isSubmitting ? 'Processing Payment...' : `Take The Corner for ${nextPriceFormatted} 🚀`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
