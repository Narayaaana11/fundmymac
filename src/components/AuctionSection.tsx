import React, { useState } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import { BRAND_SPOTS } from '../data/fundMyMacData';
import { SpotlightCard } from './SpotlightCard';

import type { DisplayCurrency } from './BrandMyMacNavbar';

interface AuctionSectionProps {
  currency: DisplayCurrency;
  onSpotClick: (spot: BrandSpot) => void;
  spots?: BrandSpot[];
  isLiveSync?: boolean;
}

export const AuctionSection: React.FC<AuctionSectionProps> = ({
  currency: _currency,
  onSpotClick,
  spots,
  isLiveSync = false
}) => {
  const [filterSurface, setFilterSurface] = useState<'all' | 'lid' | 'inside' | 'accessory'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeSpots = spots || BRAND_SPOTS;
  const primeSpots = [
    activeSpots.find((s) => s.id === 2) || BRAND_SPOTS.find((s) => s.id === 2)!, // Marquee
    activeSpots.find((s) => s.id === 1) || BRAND_SPOTS.find((s) => s.id === 1)!, // Top Left
    activeSpots.find((s) => s.id === 3) || BRAND_SPOTS.find((s) => s.id === 3)!  // Top Right
  ];

  const formatPrice = (_eur: number, _usd: number, _inr?: number) => {
    return 'Pricing Coming Soon';
  };

  const filteredSpots = activeSpots.filter((spot) => {
    const matchesSurface = filterSurface === 'all' || spot.surface === filterSurface;
    const matchesSearch =
      spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSurface && matchesSearch;
  });

  const openSpotsCount = activeSpots.filter((s) => !s.isSold).length;

  return (
    <section id="spots" className="bmm-auction-section">
      <div className="bmm-auction-inner">
        {/* Available Spots Badge */}
        <div className="bmm-spots-taken-badge">
          <span className="bmm-pulse-dot">
            <span style={{ background: isLiveSync ? '#34c759' : '#8e8e93' }} />
            <span style={{ background: isLiveSync ? 'rgba(52, 199, 89, 0.4)' : 'rgba(142, 142, 147, 0.4)' }} />
          </span>
          <span>· {openSpotsCount} of {activeSpots.length} Sticker Spaces Opening Soon</span>
          <span className="bmm-badge-divider">|</span>
          <span className="bmm-bids-count-pill">
            Public Preview
          </span>
        </div>

        <h2 className="bmm-auction-h2">Available Spaces on the Mac</h2>
        <p className="bmm-auction-desc">
          Every space travels with us to conferences, demo days, and founder meetings. Click any space to inspect perks and join the waitlist.
        </p>
        <p className="bmm-auction-pricing-note">
          Sponsorship pricing and reservation details will be announced once the campaign officially opens. Join the waitlist for priority access.
        </p>

        {/* Featured Prime Positions SpotlightCard */}
        <SpotlightCard className="bmm-leaderboard-card" spotlightColor="rgba(0, 113, 227, 0.12)">
          <div className="bmm-leaderboard-head">
            <h3 className="bmm-leaderboard-title">Featured Prime Positions</h3>
            <span className="bmm-leaderboard-link">Highest IRL Visibility →</span>
          </div>

          <ol className="bmm-leaderboard-list">
            {primeSpots.map((spot, idx) => (
              <li
                key={spot.id}
                className="bmm-leaderboard-item"
                role="button"
                tabIndex={0}
                onClick={() => onSpotClick(spot)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSpotClick(spot);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <span
                  className={`bmm-medal ${
                    idx === 0
                      ? 'bmm-medal-gold'
                      : idx === 1
                      ? 'bmm-medal-silver'
                      : 'bmm-medal-bronze'
                  }`}
                >
                  #{spot.id}
                </span>

                <span className="bmm-leaderboard-name">
                  <strong>{spot.name}</strong>
                  <span> · {spot.location} ({spot.dimensions})</span>
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="bmm-leaderboard-amount">
                    {formatPrice(spot.topBidEur, spot.topBidUsd, spot.topBidInr)}
                  </span>
                  {spot.isSold ? (
                    <span
                      className="bmm-sold-badge"
                      style={{ background: 'rgba(255, 69, 58, 0.12)', color: '#ff453a', borderColor: 'rgba(255, 69, 58, 0.3)' }}
                    >
                      Claimed
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="bmm-btn-blue bmm-claim-spot-btn"
                      style={{ fontSize: '12px', minHeight: '34px', padding: '6px 14px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSpotClick(spot);
                      }}
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </SpotlightCard>

        {/* Filter and Search Bar */}
        <div className="bmm-auction-filter-bar">
          <div className="filter-pills-row">
            {(['all', 'lid', 'inside', 'accessory'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterSurface(s)}
                className={`filter-pill-btn ${filterSurface === s ? 'active' : ''}`}
              >
                {s === 'all' ? 'All 20 Spots' : s === 'lid' ? 'Lid Spots' : s === 'inside' ? 'Inside Palm Rests' : 'Accessories'}
              </button>
            ))}
          </div>

          <div className="filter-search-box">
            <input
              type="text"
              placeholder="Search spot or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-search-input"
            />
          </div>
        </div>

        {/* Full 20 Spots List Card */}
        <SpotlightCard className="bmm-bids-table-card" spotlightColor="rgba(0, 113, 227, 0.08)">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 className="bmm-leaderboard-title">
              All Spots Directory ({filteredSpots.length} spots shown)
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
              Click any space to inspect details and join the waitlist
            </span>
          </div>

          <div className="bmm-spots-rows-list">
            {filteredSpots.map((spot) => (
              <div
                key={spot.id}
                className="bmm-spot-row"
                role="button"
                tabIndex={0}
                onClick={() => onSpotClick(spot)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSpotClick(spot);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="bmm-spot-row-left">
                  <span className="bmm-row-num">#{spot.id}</span>
                  <div className="bmm-row-details">
                    <span className="bmm-row-sponsor">{spot.name}</span>
                    <span className="bmm-row-meta">
                      {spot.size} · {spot.dimensions} — {spot.location}
                    </span>
                  </div>
                </div>

                <div className="bmm-spot-row-right">
                  <span className="bmm-leaderboard-amount">
                    {formatPrice(spot.topBidEur, spot.topBidUsd, spot.topBidInr)}
                  </span>
                  {spot.isSold ? (
                    <span
                      className="bmm-sold-badge"
                      style={{ background: 'rgba(255, 69, 58, 0.12)', color: '#ff453a', borderColor: 'rgba(255, 69, 58, 0.3)' }}
                    >
                      Claimed
                    </span>
                  ) : (
                    <span
                      className="bmm-sold-badge"
                      style={{ background: 'rgba(52, 199, 89, 0.12)', color: '#27ae60', borderColor: 'rgba(52, 199, 89, 0.3)' }}
                    >
                      Opening Soon
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
};
