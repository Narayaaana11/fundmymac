import React, { useState, useEffect } from 'react';

export type PolicyTab = 'privacy' | 'terms' | 'refund' | 'contact';

interface LegalPolicyModalProps {
  isOpen: boolean;
  initialTab?: PolicyTab;
  onClose: () => void;
}

export const LegalPolicyModal: React.FC<LegalPolicyModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="bmm-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="policy-modal-title">
      <div
        className="bmm-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', maxHeight: '88vh', overflowY: 'auto' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="bmm-modal-close"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="bmm-modal-header-badge">
          <span className="modal-pill-tag">VESPER · Legal & Trust Center</span>
        </div>

        <h2 id="policy-modal-title" className="bmm-modal-title" style={{ fontSize: '20px', marginBottom: '14px' }}>
          Policies & Transparency Commitments
        </h2>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`filter-pill-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
            style={{ fontSize: '13px', padding: '6px 14px' }}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${activeTab === 'terms' ? 'active' : ''}`}
            onClick={() => setActiveTab('terms')}
            style={{ fontSize: '13px', padding: '6px 14px' }}
          >
            Terms of Sponsorship
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${activeTab === 'refund' ? 'active' : ''}`}
            onClick={() => setActiveTab('refund')}
            style={{ fontSize: '13px', padding: '6px 14px' }}
          >
            Cancellation & Refunds
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
            style={{ fontSize: '13px', padding: '6px 14px' }}
          >
            Operator & Contact
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ color: 'var(--ink)', fontSize: '14px', lineHeight: 1.6 }}>
          {activeTab === 'privacy' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>1. Privacy & Data Handling Policy</h3>
              <p style={{ marginBottom: '12px' }}>
                We believe in total privacy and security. We collect only what is strictly required to fulfill your sponsorship placement and issue receipts.
              </p>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '12px', marginBottom: '6px' }}>Data We Collect</h4>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li><strong>Public Data (Shown on Sponsor Wall):</strong> Sponsor/Company Name, Website Link, and Logo graphic file.</li>
                <li><strong>Private Billing Data (Never Shown Publicly):</strong> Contact email used exclusively to deliver the payment receipt and coordinate physical sticker proofs.</li>
              </ul>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '12px', marginBottom: '6px' }}>Payment Processing Security</h4>
              <p style={{ marginBottom: '12px' }}>
                All payment transactions are processed through <strong>Razorpay</strong> (PCI-DSS Level 1 certified payment gateway). We never receive, process, or store credit card numbers, CVVs, net banking passwords, or UPI PINs on Fund My Mac servers.
              </p>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '12px', marginBottom: '6px' }}>Data Retention & Right to Erasure</h4>
              <p>
                Sponsors may request anonymization, removal of their logo, or deletion of their contact record from our database at any time by emailing <code>privacy@vesper.ai</code>. Requests are honored within 48 hours.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>2. Terms of Sponsorship & Placement Commitments</h3>
              <p style={{ marginBottom: '12px' }}>
                By sponsoring a spot or contributing to Fund My Mac, you support the acquisition of developer hardware (MacBook Pro 16″ Apple M5 Max / M5 Pro) and early-stage startup runway for VESPER.
              </p>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '12px', marginBottom: '6px' }}>Placement Duration & Commitment</h4>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li>Physical sticker placements on the MacBook Pro chassis, lid, palm rests, and accessories are maintained for a minimum of <strong>12 continuous months</strong> from the date of application.</li>
                <li>Digital placements on the Fund My Mac website and Sponsors Wall are maintained permanently for all verified founding backers.</li>
                <li>The MacBook will travel to tech conferences, hackathons, demo days, and founder venues in Silicon Valley, Bengaluru, and international tech hubs as outlined in the IRL roadmap.</li>
              </ul>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '12px', marginBottom: '6px' }}>Content Moderation & Brand Safety</h4>
              <p>
                To maintain brand safety for all sponsors, we reserve the right to decline or remove submissions promoting hate speech, illegal products, harassment, or malicious software. In such cases, 100% of the funds will be immediately refunded.
              </p>
            </div>
          )}

          {activeTab === 'refund' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>3. Cancellation & Refund Policy</h3>
              <p style={{ marginBottom: '12px' }}>
                We stand behind our transparency and founder commitments.
              </p>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '12px', marginBottom: '6px' }}>48-Hour Pre-Print Grace Window</h4>
              <p style={{ marginBottom: '12px' }}>
                If you change your mind within 48 hours of completing checkout—before physical high-resolution vinyl stickers are printed—you are entitled to a <strong>100% full refund</strong> with no questions asked.
              </p>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '12px', marginBottom: '6px' }}>Technical Failure & Duplicate Charges</h4>
              <p style={{ marginBottom: '12px' }}>
                In the rare event of a network glitch, race condition, or duplicate charge where an inventory spot was not properly assigned, our automated reconciliation engine releases the spot and issues an automatic refund to your source payment method within 5–7 business days via Razorpay.
              </p>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '12px', marginBottom: '6px' }}>How to Request a Refund</h4>
              <p>
                Email <code>support@vesper.ai</code> with your Razorpay Payment ID (e.g. <code>pay_...</code>) or Order ID. Refunds are processed directly back to the original source account.
              </p>
            </div>
          )}

          {activeTab === 'contact' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>4. Operator, Support & Grievance Details</h3>
              <p style={{ marginBottom: '12px' }}>
                Fund My Mac is an open campaign organized by the founding team behind <strong>VESPER</strong> (Autonomous AI Developer Workspace).
              </p>
              <div style={{ background: 'var(--subtle-bg, #f5f5f7)', padding: '16px', borderRadius: '10px', marginTop: '12px' }}>
                <p><strong>Campaign Operator:</strong> VESPER AI Core Engineering Team</p>
                <p style={{ marginTop: '6px' }}><strong>Principal Contact:</strong> Narayana & VESPER Founders</p>
                <p style={{ marginTop: '6px' }}><strong>Support Email:</strong> <a href="mailto:support@vesper.ai" style={{ color: 'var(--blue)' }}>support@vesper.ai</a></p>
                <p style={{ marginTop: '6px' }}><strong>Founder Inquiries:</strong> <a href="mailto:founders@vesper.ai" style={{ color: 'var(--blue)' }}>founders@vesper.ai</a></p>
                <p style={{ marginTop: '6px' }}><strong>Grievance Officer:</strong> Grievance Redressal Officer, VESPER Campaign</p>
                <p style={{ marginTop: '6px' }}><strong>Operational Locations:</strong> Bengaluru, Karnataka, India · San Francisco, CA, USA</p>
              </div>
              <p style={{ marginTop: '14px', fontSize: '12px', color: 'var(--ink-2)' }}>
                Response time: We typically respond to all support and sponsorship inquiries within 12–24 business hours.
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
          <button
            type="button"
            className="bmm-btn-blue"
            onClick={onClose}
            style={{ padding: '8px 22px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
