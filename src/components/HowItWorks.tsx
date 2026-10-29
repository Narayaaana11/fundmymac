import React from 'react';

export const HowItWorks: React.FC = () => {
  return (
    <section id="how" className="bmm-how-section">
      <div className="bmm-section-inner">
        <div className="bmm-pill-badge-blue" style={{ display: 'inline-flex', marginBottom: '12px' }}>
          <span>SIMPLE 3-STEP PROCESS</span>
        </div>
        <h2 className="bmm-auction-h2">How Sponsoring Fund My Mac Works</h2>
        <p className="bmm-auction-desc" style={{ marginBottom: '28px' }}>
          Transparent, high-impact marketing for startups, dev tools, and visionary sponsors.
        </p>

        <div className="bmm-how-grid">
          <div className="bmm-how-card">
            <div className="bmm-how-num">1</div>
            <h3 className="bmm-how-title">Pick a Spot or Sponsor Tier</h3>
            <p className="bmm-how-desc">
              Choose from 20 sticker spots across the MacBook Pro interactive canvas, the live Corner banner, or an official backer package.
            </p>
          </div>

          <div className="bmm-how-card">
            <div className="bmm-how-num">2</div>
            <h3 className="bmm-how-title">High-Grade Vinyl Printing & Demos</h3>
            <p className="bmm-how-desc">
              We produce custom UV-resistant 3M matte stickers for the machine. If you make software or dev-tools, we actively test and demo your product in meetings.
            </p>
          </div>

          <div className="bmm-how-card">
            <div className="bmm-how-num">3</div>
            <h3 className="bmm-how-title">Your Brand Travels Everywhere</h3>
            <p className="bmm-how-desc">
              Everywhere the MacBook Pro goes — TechCrunch Disrupt, AI summits, Bangalore & SF founder hubs, and VC pitch rooms — your brand is front and center.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
