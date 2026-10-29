import React, { useState } from 'react';
import { LegalPolicyModal, type PolicyTab } from './LegalPolicyModal';

export const BrandMyMacFooter: React.FC = () => {
  const [activePolicyTab, setActivePolicyTab] = useState<PolicyTab | null>(null);

  return (
    <>
      <footer className="bmm-footer">
        <div className="bmm-footer-inner">
          <div className="bmm-footer-bio">
            <h3 className="bmm-footer-greeting">Building VESPER with our community 🚀</h3>
            <p className="bmm-footer-text">
              We’re an ambitious early-stage founder team building <strong>VESPER</strong> (autonomous AI developer workspace). When our Asus TUF laptop died from a short-circuit, we decided to bootstrap our first MacBook Pro 16″ (Apple M5 Max / M5 Pro) through transparent real-world sponsorships. With no budget limit, all extra funds directly fuel VESPER startup operations, model training, and roadshows.
            </p>
            <p className="bmm-footer-text" style={{ marginTop: '8px' }}>
              Every sponsor travels with us to conferences, demo days, VC meetings, and developer workshops. Want to partner or have questions? Email us at{' '}
              <a
                href="mailto:founders@vesper.ai"
                style={{ color: 'var(--blue)', textDecoration: 'underline' }}
              >
                founders@vesper.ai
              </a>.
            </p>
          </div>

          <div className="bmm-footer-links-row">
            <a href="#macbook-showcase">The Machine</a>
            <a href="#vesper-mission">The Mission</a>
            <a href="#events">IRL Events</a>
            <a href="#sponsors">Sponsors Wall</a>
            <a href="#sponsor-tiers">Sponsor Tiers</a>
            <a href="#specs">Hardware Specs</a>
            <a href="#faq">FAQ</a>
          </div>

          {/* Compliance, Trust & Legal Policies Row */}
          <div className="bmm-footer-links-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '12px' }}>
            <button
              type="button"
              onClick={() => setActivePolicyTab('privacy')}
              style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', padding: 0, textDecoration: 'underline', font: 'inherit' }}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setActivePolicyTab('terms')}
              style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', padding: 0, textDecoration: 'underline', font: 'inherit' }}
            >
              Terms of Sponsorship
            </button>
            <button
              type="button"
              onClick={() => setActivePolicyTab('refund')}
              style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', padding: 0, textDecoration: 'underline', font: 'inherit' }}
            >
              Cancellation & Refund Policy
            </button>
            <button
              type="button"
              onClick={() => setActivePolicyTab('contact')}
              style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', padding: 0, textDecoration: 'underline', font: 'inherit' }}
            >
              Operator, Support & Grievances
            </button>
          </div>

          <p className="bmm-footer-disclaimer">
            Fund My Mac & VESPER are independent projects and are not affiliated with, endorsed by, or sponsored by Apple Inc. MacBook Pro and macOS are registered trademarks of Apple Inc.
          </p>
        </div>
      </footer>

      {activePolicyTab && (
        <LegalPolicyModal
          isOpen={true}
          initialTab={activePolicyTab}
          onClose={() => setActivePolicyTab(null)}
        />
      )}
    </>
  );
};
