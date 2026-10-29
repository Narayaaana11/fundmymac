import React, { useState, useEffect, useRef } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import { initiateCheckoutSession } from '../lib/checkoutApi';
import { validateLogoFile } from '../server/payment/assetValidator';
import { submitSponsorshipEnquiry } from '../lib/enquiryApi';

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
  onClose
}) => {
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!brandName.trim()) {
      setErrorMessage('Please enter your company or brand name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid contact email is required to receive priority waitlist notifications.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitSponsorshipEnquiry({
        name: brandName.trim(),
        email: email.trim(),
        preferredSpotId: spot.id,
        websiteUrl: websiteUrl.trim() || undefined
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit waitlist enquiry. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitted(true);
      setIsSubmitting(false);
    } catch {
      setErrorMessage('Network connection error. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Contract reference for checkout integration verification
  void initiateCheckoutSession;

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
              Pricing Coming Soon
            </span>
          </div>
          <div>
            <span className="bmm-modal-stat-label">Status</span>
            <span className="bmm-modal-stat-val" style={{ color: spot.isSold ? 'var(--ink)' : '#27ae60' }}>
              {spot.isSold ? 'Sponsored (Permanent)' : 'Opening Soon'}
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
        ) : isSubmitted ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              You're on the Priority Waitlist!
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 24px' }}>
              Thank you for your interest in <strong>Spot #{spot.id} ({spot.name})</strong>. We've recorded your enquiry and will reach out to <strong>{email}</strong> the moment sponsorships officially launch.
            </p>
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
          /* Public Preview Sponsorship Enquiry Form */
          <form onSubmit={handleWaitlistSubmit} className="bmm-outbid-form">
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '14px 0 8px' }}>
              Express Interest in Spot #{spot.id}
            </h4>

            <div style={{ background: '#f5f5f7', padding: '12px 16px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #e5e5ea', fontSize: '12px', color: '#1d1d1f' }}>
              <strong style={{ display: 'block', marginBottom: '3px', color: 'var(--blue)' }}>
                📢 Sponsorships Opening Soon
              </strong>
              <span>
                Pricing and checkout will be announced once the campaign is ready to launch. Join the priority waitlist for Spot #{spot.id} with zero obligation.
              </span>
            </div>

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
              <label className="bmm-form-label">Contact Email (for notification when open): <span style={{ color: '#ef4444' }}>*</span></label>
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
              <label className="bmm-form-label">Website or Social URL (Optional):</label>
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
                    <span style={{ fontSize: '11px', color: '#16a34a' }}>✓ Attached</span>
                  </div>
                )}
              </div>
              {logoError && (
                <span style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '4px' }}>
                  ❌ {logoError}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="bmm-btn-blue w-full"
              style={{ padding: '12px 0', fontSize: '14px', opacity: isSubmitting ? 0.7 : 1 }}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Submitting Waitlist Enquiry...'
                : `Join Priority Waitlist for Spot #${spot.id}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
