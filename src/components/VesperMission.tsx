import React from 'react';
import { SpotlightCard } from './SpotlightCard';

export const VesperMission: React.FC = () => {
  return (
    <section id="vesper-mission" className="bmm-section bmm-vesper-section">
      <div className="bmm-section-inner">
        {/* Header Badge */}
        <div className="bmm-pill-badge-indigo">
          <span className="bmm-pulse-dot-indigo" />
          <span>THE MISSION · BUILDING VESPER</span>
        </div>

        <h2 className="bmm-vesper-h2">
          From a Fried Asus TUF to a MacBook Pro: <br />
          <span>Why We Turned Our Machine Into an Advertising Canvas</span>
        </h2>

        <p className="bmm-vesper-sub">
          We’re building <strong>VESPER</strong> — a focused developer workspace designed to streamline complex engineering workflows and run local models efficiently without thermal throttling.
        </p>

        {/* Story Grid */}
        <div className="bmm-story-grid">
          {/* Card 1: The Short Circuit */}
          <SpotlightCard className="bmm-story-card" spotlightColor="rgba(239, 68, 68, 0.12)">
            <div className="story-icon-box bg-red">⚡</div>
            <h3 className="story-card-title">The Asus TUF Short-Circuit</h3>
            <p className="story-card-desc">
              During a 48-hour model training sprint, our Asus TUF F15 gaming laptop suffered a catastrophic motherboard short-circuit. Development halted overnight. We needed reliable Unix-native Apple Silicon with unified memory to continue building VESPER.
            </p>
            <div className="story-status-tag red">Hardware Casualty · August 2026</div>
          </SpotlightCard>

          {/* Card 2: No Dilutive Angel Checks for Laptops */}
          <SpotlightCard className="bmm-story-card" spotlightColor="rgba(245, 158, 11, 0.12)">
            <div className="story-icon-box bg-amber">💡</div>
            <h3 className="story-card-title">No Dilutive Equity for Hardware</h3>
            <p className="story-card-desc">
              Raising early VC checks or taking dilutive angel investment just to buy a developer laptop doesn't make sense. Instead, we decided to give high-conviction companies and startups high-ROI visibility both in real life and across our dev network.
            </p>
            <div className="story-status-tag amber">100% Bootstrapped Marketing Canvas</div>
          </SpotlightCard>

          {/* Card 3: The MacBook Pro Apple M5 Max / M5 Pro Target */}
          <SpotlightCard className="bmm-story-card" spotlightColor="rgba(0, 113, 227, 0.12)">
            <div className="story-icon-box bg-blue">💻</div>
            <h3 className="story-card-title">MacBook Pro 16″ (M5 Max / M5 Pro)</h3>
            <p className="story-card-desc">
              Configured with 128GB unified memory and 2TB SSD to train and evaluate VESPER local workflows. <strong>No budget limit:</strong> all extra funds beyond hardware costs directly fuel cloud GPU compute, model training, and global roadshow demos.
            </p>
            <div className="story-status-tag blue">Milestone 1 Goal: $4,000 · No Limit for Startup Runway</div>
          </SpotlightCard>
        </div>

        {/* Sponsor ROI & IRL Perks Showcase */}
        <div className="bmm-perks-banner">
          <h3 className="bmm-perks-title">What You Get When You Sponsor or Donate</h3>
          <p className="bmm-perks-sub">
            This isn’t just a sticker on an aluminum lid — it’s a physical and digital billboard traveling with us to the highest-density tech hubs on earth.
          </p>

          <div className="bmm-perks-columns">
            <div className="bmm-perk-item">
              <div className="perk-bullet-num">01</div>
              <div>
                <h4>Startup Summits & Demo Days</h4>
                <p>
                  We are actively demoing VESPER at TechCrunch Disrupt, the Global AI Engineer Summit, YC/Antler alumni demo nights, and hackathons. Your brand faces tech founders, journalists, and Tier-1 VCs.
                </p>
              </div>
            </div>

            <div className="bmm-perk-item">
              <div className="perk-bullet-num">02</div>
              <div>
                <h4>Live Product Demonstrations</h4>
                <p>
                  Are you an AI tool, dev-tool, SaaS, or API provider? We won't just stick your logo — we will actively test, use, and demo your product in meetings and founder workshops on this MacBook.
                </p>
              </div>
            </div>

            <div className="bmm-perk-item">
              <div className="perk-bullet-num">03</div>
              <div>
                <h4>Official Sponsors Wall & Dofollow Links</h4>
                <p>
                  Permanent high-resolution logo, company bio, and dofollow backlink on our official Fund My Mac Sponsors Wall and in the VESPER project documentation & GitHub README.
                </p>
              </div>
            </div>

            <div className="bmm-perk-item">
              <div className="perk-bullet-num">04</div>
              <div>
                <h4>Build-in-Public & Pitch Deck Credits</h4>
                <p>
                  Every weekly devlog, X/LinkedIn update, and demo day slide deck features our sponsors prominently with "Powered by [Your Brand]" recognition.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
