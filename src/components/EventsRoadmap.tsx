import React from 'react';
import { UPCOMING_EVENTS } from '../data/fundMyMacData';
import { SpotlightCard } from './SpotlightCard';

export const EventsRoadmap: React.FC = () => {
  return (
    <section id="events" className="bmm-section bmm-events-section">
      <div className="bmm-section-inner">
        <div className="bmm-pill-badge-blue">
          <span>📍 IRL ROADSHOW · 2026 - 2027</span>
        </div>

        <h2 className="bmm-section-title">Where Your Brand Will Travel</h2>
        <p className="bmm-section-subtitle">
          Your stickers and products will be seen in high-impact rooms by founders, angel investors, CTOs, and venture capitalists.
        </p>

        <div className="bmm-events-grid">
          {UPCOMING_EVENTS.map((event) => (
            <SpotlightCard
              key={event.id}
              className="bmm-event-card"
              spotlightColor="rgba(0, 113, 227, 0.15)"
            >
              <div className="event-card-header">
                <span className="event-badge">{event.type}</span>
                <span className="event-date">{event.date}</span>
              </div>

              <h3 className="event-name">{event.name}</h3>
              <p className="event-location">📍 {event.location}</p>

              <div className="event-meta-box">
                <div className="event-stat">
                  <span className="stat-label">Expected Audience:</span>
                  <span className="stat-val">{event.expectedAttendees}</span>
                </div>
                <div className="event-highlight">
                  <span className="stat-label">Sponsor Visibility:</span>
                  <p className="highlight-text">{event.highlight}</p>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>

        {/* Live Product Display CTA Box */}
        <div className="bmm-product-demo-box">
          <div className="demo-box-icon">🤝</div>
          <div className="demo-box-content">
            <h4>Want Us to Demo Your Product at These Events?</h4>
            <p>
              If your company makes developer tools, APIs, AI infrastructure, or hardware accessories, our team will actively showcase and recommend your product during meetings and stage presentations.
            </p>
          </div>
          <a href="#sponsor-tiers" className="bmm-btn-blue demo-box-cta">
            Book a Sponsor Tier
          </a>
        </div>
      </div>
    </section>
  );
};
