import React from 'react';

export const BrandMyMacFooter: React.FC = () => {
  return (
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

        <p className="bmm-footer-disclaimer">
          Fund My Mac & VESPER are independent projects and are not affiliated with, endorsed by, or sponsored by Apple Inc. MacBook Pro and macOS are registered trademarks of Apple Inc.
        </p>
      </div>
    </footer>
  );
};
