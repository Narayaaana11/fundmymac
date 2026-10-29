import React, { useState, useEffect } from 'react';
import type { SponsorTier } from '../data/fundMyMacData';
import { SPONSOR_TIERS } from '../data/fundMyMacData';
import { SpotlightCard } from './SpotlightCard';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

import type { DisplayCurrency } from './BrandMyMacNavbar';

interface ConfirmedSponsor {
  order_id: string;
  sponsor_name: string;
  sponsor_url?: string;
  logo_url?: string;
  amount_cents: number;
  currency: string;
  tier_id?: string;
  spot_id?: number;
}

interface SponsorsWallProps {
  currency: DisplayCurrency;
  onSelectTier: (tier: SponsorTier) => void;
  onOpenCustomDonation: () => void;
}

export const SponsorsWall: React.FC<SponsorsWallProps> = ({
  currency: _currency,
  onSelectTier,
  onOpenCustomDonation
}) => {
  const [confirmedSponsors, setConfirmedSponsors] = useState<ConfirmedSponsor[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from('public_sponsors_wall')
      .select('order_id, sponsor_name, sponsor_url, logo_url, amount_cents, currency, tier_id, spot_id')
      .limit(20)
      .then(({ data, error }) => {
        if (!error && data) {
          setConfirmedSponsors(data);
        }
      });
  }, []);

  const foundingSlots = [
    { id: 1, title: 'Marquee Title Partner', priceUsd: 500, priceEur: 460, priceInr: 42000, spot: 'Above Apple Logo · Highest IRL Visibility' },
    { id: 2, title: 'Lid Prime Partner', priceUsd: 250, priceEur: 230, priceInr: 21000, spot: 'MacBook Pro Aluminum Lid · Demo Days' },
    { id: 3, title: 'Accessory / Charger Partner', priceUsd: 150, priceEur: 138, priceInr: 12500, spot: '140W GaN Apple Fast Charger Body' },
    { id: 4, title: 'The Corner Sponsor', priceUsd: 75, priceEur: 69, priceInr: 6300, spot: 'Sticky Top Left Widget Banner' }
  ];

  const formatPrice = (_tier: SponsorTier) => {
    return 'Pricing Coming Soon';
  };

  return (
    <section id="sponsors" className="bmm-section bmm-sponsors-section">
      <div className="bmm-section-inner">
        {/* Section Header */}
        <div className="bmm-pill-badge-green">
          <span>🏆 OFFICIAL SPONSORS WALL</span>
        </div>

        <h2 className="bmm-section-title">Founding Partners & Backers</h2>
        <p className="bmm-section-subtitle">
          Be among the visionary tech companies and developers backing our MacBook Pro. Your logo and company receive permanent placement on this wall and across the VESPER ecosystem.
        </p>

        {/* Confirmed Verified Sponsors (if any) */}
        {confirmedSponsors.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#16a34a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✓ Verified Confirmed Partners ({confirmedSponsors.length})</span>
            </h3>
            <div className="bmm-sponsors-logo-grid">
              {confirmedSponsors.map((sponsor) => (
                <div key={sponsor.order_id} className="bmm-sponsor-card" style={{ background: '#ffffff', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div className="sponsor-card-top">
                    <span className="sponsor-spot-tag">{sponsor.spot_id ? `Spot #${sponsor.spot_id}` : 'Backer Tier'}</span>
                    <span className="sponsor-surface-tag" style={{ background: 'rgba(52, 199, 89, 0.15)', color: '#16a34a', fontWeight: 700 }}>
                      CONFIRMED
                    </span>
                  </div>

                  <div className="sponsor-placeholder-logo" style={{ margin: '12px 0', border: 'none', background: '#f5f5f7' }}>
                    {sponsor.logo_url ? (
                      <img src={sponsor.logo_url} alt={sponsor.sponsor_name} style={{ maxHeight: '42px', maxWidth: '80%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--blue)' }}>
                        {sponsor.sponsor_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h4 className="sponsor-card-name">{sponsor.sponsor_name}</h4>
                  <strong style={{ fontSize: '14px', color: 'var(--blue)' }}>
                    {(sponsor.amount_cents / 100).toLocaleString()} {sponsor.currency.toUpperCase()}
                  </strong>
                  {sponsor.sponsor_url && (
                    <a
                      href={sponsor.sponsor_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sponsor-visit-link"
                      style={{ marginTop: '6px' }}
                    >
                      Visit Website ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Founding Sponsor Open Slots */}
        <div className="bmm-sponsors-logo-grid" style={{ marginBottom: '44px' }}>
          {foundingSlots.map((slot) => (
            <div
              key={slot.id}
              className="bmm-sponsor-card"
              style={{ borderStyle: 'dashed', cursor: 'pointer', background: 'rgba(255, 255, 255, 0.7)' }}
              onClick={onOpenCustomDonation}
            >
              <div className="sponsor-card-top">
                <span className="sponsor-spot-tag">Slot #{slot.id}</span>
                <span className="sponsor-surface-tag" style={{ background: 'rgba(52, 199, 89, 0.12)', color: '#27ae60' }}>
                  OPENING SOON
                </span>
              </div>

              <div className="sponsor-placeholder-logo" style={{ margin: '14px 0', border: '2px dashed #0071e3', background: 'transparent' }}>
                +
              </div>

              <h4 className="sponsor-card-name">{slot.title}</h4>
              <p className="sponsor-card-bid" style={{ fontSize: '11px', color: 'var(--ink-2)', marginBottom: '8px' }}>
                {slot.spot}
              </p>
              <strong style={{ fontSize: '14px', color: 'var(--blue)' }}>
                Pricing Coming Soon
              </strong>
              <span className="sponsor-visit-link" style={{ marginTop: '8px' }}>
                Express Interest ›
              </span>
            </div>
          ))}
        </div>

        {/* Sponsor Packages / Pricing Tiers */}
        <div id="sponsor-tiers" className="bmm-tiers-wrapper">
          <div className="bmm-tiers-header">
            <h3 className="bmm-tiers-title">Sponsorship Tiers & Perks</h3>
            <p className="bmm-tiers-desc">
              Explore our sponsorship tiers. Express your interest early to secure your spot when the campaign launches.
            </p>
          </div>

          <div className="bmm-tiers-grid">
            {SPONSOR_TIERS.map((tier) => (
              <SpotlightCard
                key={tier.id}
                className={`bmm-tier-card ${tier.recommended ? 'recommended-tier' : ''}`}
                spotlightColor={tier.recommended ? 'rgba(0, 113, 227, 0.22)' : 'rgba(0, 0, 0, 0.05)'}
              >
                {tier.recommended && (
                  <div className="tier-recommended-badge">MOST POPULAR IRL TIER</div>
                )}

                <div className="tier-head">
                  <h4 className="tier-name">{tier.name}</h4>
                  <div className="tier-price-row">
                    <span className="tier-price">{formatPrice(tier)}</span>
                  </div>
                </div>

                <ul className="tier-perks-list">
                  {tier.perks.map((perk, idx) => (
                    <li key={idx} className="tier-perk-item">
                      <span className="perk-check">✓</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => onSelectTier(tier)}
                  className={`bmm-btn-tier ${tier.recommended ? 'bmm-btn-blue' : 'bmm-btn-outline'}`}
                >
                  Join Waitlist · {tier.name}
                </button>
              </SpotlightCard>
            ))}
          </div>

          {/* Custom Donation Banner */}
          <div className="bmm-custom-donate-banner">
            <div>
              <h4>Want to Support as an Early Backer?</h4>
              <p>Every dollar directly finances our Apple M5 Max / M5 Pro machine and VESPER startup compute once sponsorships officially open.</p>
            </div>
            <button
              type="button"
              onClick={onOpenCustomDonation}
              className="bmm-btn-emerald"
            >
              💖 Join the Campaign Waitlist
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
