import React, { useState } from 'react';
import { submitSponsorshipEnquiry } from '../lib/enquiryApi';
import { BRAND_SPOTS } from '../data/fundMyMacData';

export const WaitlistSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [preferredSpotId, setPreferredSpotId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Spam honeypot detection
    if (honeypot) {
      setIsSubmitted(true);
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Please provide your brand or company name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid contact email.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitSponsorshipEnquiry({
        name: name.trim(),
        email: email.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        preferredSpotId: preferredSpotId ? parseInt(preferredSpotId, 10) : null,
        message: message.trim() || undefined
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to submit enquiry. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitted(true);
      setIsSubmitting(false);
    } catch {
      setErrorMessage('Network connection error. Please try again shortly.');
      setIsSubmitting(false);
    }
  };

  return (
    <section id="waitlist" className="bmm-waitlist-section" style={{ padding: '80px 20px', background: '#fafafc' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            className="bmm-pill-badge-green"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'rgba(0, 113, 227, 0.1)',
              color: '#0071e3',
              marginBottom: '16px',
              border: '1px solid rgba(0, 113, 227, 0.2)'
            }}
          >
            <span>✨ PUBLIC PREVIEW · PRIORITY WAITLIST</span>
          </div>

          <h2 style={{ fontSize: '36px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Secure Your Brand on Our Mac.
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
            Fund My Mac is currently in public preview while Razorpay merchant account approval is pending.
            Join the waitlist today to be notified the moment official checkout opens.
          </p>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '36px 32px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            border: '1px solid #e5e5ea'
          }}
        >
          {isSubmitted ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎉</div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
                You're on the Priority Waitlist!
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 20px' }}>
                Thank you, <strong>{name}</strong>! We've recorded your interest for notification at <strong>{email}</strong>.
                Our team will reach out with early access before public announcements.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setName('');
                  setEmail('');
                  setWebsiteUrl('');
                  setPreferredSpotId('');
                  setMessage('');
                }}
                className="bmm-btn-blue"
                style={{ padding: '10px 28px', fontSize: '14px', borderRadius: '980px' }}
              >
                Submit Another Enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="enquiry-form">
              {/* Anti-spam honeypot (hidden from human visitors) */}
              <input
                type="text"
                name="company_fax"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              {errorMessage && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #f87171',
                    color: '#991b1b',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    marginBottom: '20px'
                  }}
                >
                  ⚠️ {errorMessage}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="bmm-form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Brand / Company Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="waitlist-brand-name"
                    name="brand_name"
                    required
                    placeholder="Acme AI, Supabase, YourApp"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bmm-input-field"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '14px' }}
                    disabled={isSubmitting}
                    maxLength={120}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="waitlist-email" className="bmm-form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Work / Founder Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    id="waitlist-email"
                    name="work_email"
                    required
                    placeholder="founder@yourstartup.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bmm-input-field"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '14px' }}
                    disabled={isSubmitting}
                    maxLength={255}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label htmlFor="waitlist-website" className="bmm-form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Company Website URL
                  </label>
                  <input
                    type="url"
                    id="waitlist-website"
                    name="website_url"
                    placeholder="https://yourstartup.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="bmm-input-field"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '14px' }}
                    disabled={isSubmitting}
                    maxLength={300}
                  />
                </div>

                <div className="form-group">
                  <label className="bmm-form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Preferred Placement
                  </label>
                  <select
                    value={preferredSpotId}
                    onChange={(e) => setPreferredSpotId(e.target.value)}
                    className="bmm-input-field"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '14px', background: '#fff' }}
                    disabled={isSubmitting}
                  >
                    <option value="">Any Available Spot</option>
                    <option value="corner">The Corner Takeover</option>
                    {BRAND_SPOTS.map((s) => (
                      <option key={s.id} value={s.id.toString()}>
                        Spot #{s.id} — {s.name} ({s.surface.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="bmm-form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Custom Notes or Demo Day Goals (Optional)
                </label>
                <textarea
                  id="waitlist-message"
                  name="message"
                  rows={3}
                  placeholder="Tell us about your brand, upcoming launches, or demo days you want visibility in..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bmm-input-field"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '14px', resize: 'vertical' }}
                  disabled={isSubmitting}
                  maxLength={1000}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bmm-btn-blue"
                style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, borderRadius: '12px' }}
              >
                {isSubmitting ? 'Registering...' : 'Join Priority Waitlist 🚀'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--ink-2)', marginTop: '12px' }}>
                🔒 Zero spam. Enquiries are securely protected under Supabase Row-Level Security and never shared.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
