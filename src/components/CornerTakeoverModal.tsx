import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { DisplayCurrency } from './BrandMyMacNavbar';
import type { CornerState } from '../data/fundMyMacData';
import { validateLogoFile } from '../server/payment/assetValidator';
import { loadRazorpayScript } from '../lib/checkoutApi';
import { submitSponsorshipEnquiry } from '../lib/enquiryApi';
import { IS_PUBLIC_PREVIEW } from '../config/previewConfig';

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
  currency: _currency,
  cornerData,
  onClose,
  onTakeoverSuccess
}) => {
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [razorpayKeyInput, setRazorpayKeyInput] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('fundmymac_razorpay_key') || '' : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RAZORPAY_KEY_ID) || '';
  const effectiveKey = envKey && !envKey.includes('placeholder') && !envKey.includes('preview')
    ? envKey
    : razorpayKeyInput;

  const handleClose = useCallback(() => {
    setIsSubmitted(false);
    setErrorMessage(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const nextPriceFormatted = `$${cornerData.nextBidUsd || 45}`;
  const nextPriceAmount = cornerData.nextBidUsd || 45;

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

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    // Finding B Fix: In Public Preview, strictly route to enquiry/waitlist flow.
    // Zero simulated takeover, zero false payment confirmation, zero inventory mutation.
    if (IS_PUBLIC_PREVIEW) {
      try {
        const result = await submitSponsorshipEnquiry({
          name: brandName.trim(),
          email: email.trim(),
          websiteUrl: websiteUrl.trim(),
          tierId: 'corner_takeover',
          message: `Corner Takeover waitlist expression for ${brandName.trim()} (${websiteUrl.trim()})`
        });

        if (!result.success) {
          setErrorMessage(result.error || 'Failed to record waitlist expression. Please try again.');
          setIsSubmitting(false);
          return;
        }

        setIsSubmitted(true);
        setIsSubmitting(false);
        return;
      } catch {
        setErrorMessage('Network connection error. Please try again shortly.');
        setIsSubmitting(false);
        return;
      }
    }

    // Live Production Flow (Only active when public preview is disabled and live keys configured)
    try {
      const isScriptLoaded = await loadRazorpayScript();

      if (!effectiveKey) {
        setErrorMessage('Please enter your Razorpay Key ID (rzp_test_... or rzp_live_...) below to proceed.');
        setIsSubmitting(false);
        return;
      }

      if (isScriptLoaded && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: effectiveKey,
          amount: nextPriceAmount * 100,
          currency: 'USD',
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
        setErrorMessage('Failed to load Razorpay checkout script. Please check your network connection.');
        setIsSubmitting(false);
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
          <span className="modal-pill-tag">
            {IS_PUBLIC_PREVIEW ? '✨ THE CORNER · PUBLIC PREVIEW' : '🔥 THE CORNER TAKEOVER'}
          </span>
        </div>

        <h3 id="corner-modal-title" className="bmm-modal-title">
          The Corner Placement
        </h3>
        <p className="bmm-modal-subtitle">
          Display your brand on every page view at the top-left of the screen across desktop and mobile.
        </p>

        {isSubmitted ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              background: 'rgba(52, 199, 89, 0.08)',
              borderRadius: '12px',
              border: '1px solid rgba(52, 199, 89, 0.3)',
              margin: '20px 0'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              You're on the Corner Priority Waitlist!
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: '16px' }}>
              Fund My Mac is in public preview while Razorpay merchant approval is finalized.
              We'll notify <strong>{email}</strong> the moment The Corner officially launches.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bmm-btn-blue"
              style={{ padding: '10px 24px', fontSize: '14px', borderRadius: '980px' }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
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
                  Current Sponsor
                </span>
                <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                  {cornerData.currentSponsor}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--blue)', fontWeight: 600 }}>
                  Takeover Status
                </span>
                <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#0071e3' }}>
                  {IS_PUBLIC_PREVIEW ? 'Pricing Coming Soon' : nextPriceFormatted}
                </span>
              </div>
            </div>

            {IS_PUBLIC_PREVIEW && (
              <div
                style={{
                  background: 'rgba(0, 113, 227, 0.06)',
                  border: '1px solid rgba(0, 113, 227, 0.2)',
                  color: '#0071e3',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  marginBottom: '14px',
                  lineHeight: 1.4
                }}
              >
                ℹ️ <strong>Public Preview Notice:</strong> Razorpay merchant onboarding is pending. Join the priority waitlist below to be notified first when The Corner opens.
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

            <form onSubmit={handleCornerSubmit} className="bmm-outbid-form">
              {(!envKey || envKey.includes('placeholder')) && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px' }}>
                  <label className="bmm-form-label" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    🔑 Razorpay Key ID:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. rzp_test_..."
                    value={razorpayKeyInput}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setRazorpayKeyInput(val);
                      if (typeof window !== 'undefined') localStorage.setItem('fundmymac_razorpay_key', val);
                    }}
                    className="bmm-input-field"
                    style={{ fontSize: '13px', padding: '7px 10px', background: '#fff' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--ink-2)', display: 'block', marginTop: '4px' }}>
                    Enter your Razorpay test or live Key ID (or configure in .env)
                  </span>
                </div>
              )}

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
                <label className="bmm-form-label">Brand Icon / Avatar (Optional preview):</label>
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
                    <span style={{ fontSize: '11px', color: '#34c759' }}>Avatar ready for inspection</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #e5e5ea', paddingTop: '14px', marginTop: '12px' }}>
                <p style={{ fontSize: '11px', color: 'var(--ink-2)', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                  🔒 The Corner is permanently visible across all pages and viewports. Outbid history remains archived in the public directory.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bmm-btn-blue"
                  style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600 }}
                >
                  {isSubmitting
                    ? 'Submitting to Waitlist...'
                    : IS_PUBLIC_PREVIEW
                    ? 'Join Corner Priority Waitlist 🚀'
                    : `Take The Corner for ${nextPriceFormatted} 🚀`}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
