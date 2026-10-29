import React, { useState } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import { BRAND_SPOTS } from '../data/fundMyMacData';
import { SpotlightCard } from './SpotlightCard';

interface AuctionSectionProps {
  currency: 'EUR' | 'USD';
  onSpotClick: (spot: BrandSpot) => void;
  spots?: BrandSpot[];
}

export const AuctionSection: React.FC<AuctionSectionProps> = ({
  currency,
  onSpotClick,
  spots
}) => {
  const [filterSurface, setFilterSurface] = useState<'all' | 'lid' | 'inside' | 'accessory'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeSpots = spots || BRAND_SPOTS;
  const primeSpots = [
    activeSpots.find((s) => s.id === 2) || BRAND_SPOTS.find((s) => s.id === 2)!, // Marquee
    activeSpots.find((s) => s.id === 1) || BRAND_SPOTS.find((s) => s.id === 1)!, // Top Left
    activeSpots.find((s) => s.id === 3) || BRAND_SPOTS.find((s) => s.id === 3)!  // Top Right
  ];

  const formatPrice = (eur: number, usd: number) => {
    return currency === 'EUR' ? `${eur.toLocaleString()} €` : `$${usd.toLocaleString()}`;
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
            <span />
            <span />
          </span>
          <span>· {openSpotsCount} of {activeSpots.length} Sticker Spots Open for Sponsorship</span>
          <span className="bmm-badge-divider">|</span>
          <span className="bmm-bids-count-pill">Live Reserve</span>
        </div>

        <h2 className="bmm-auction-h2">Available Spots on the Mac</h2>
        <p className="bmm-auction-desc">
          Every spot travels with us to conferences, demo days, and founder meetings. Click any spot to secure your placement.
        </p>
        <p className="bmm-auction-pricing-note">
          Lid spots from {currency === 'EUR' ? '90 €' : '$100'} Small · {currency === 'EUR' ? '160 €' : '$175'} Medium · {currency === 'EUR' ? '230 €' : '$250'} Large · {currency === 'EUR' ? '460 €' : '$500'} Prime Marquee. Palm rest & accessory spots starting at {currency === 'EUR' ? '70 €' : '$75'}.
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
                onClick={() => onSpotClick(spot)}
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
                    {formatPrice(spot.topBidEur, spot.topBidUsd)}
                  </span>
                  <button type="button" className="bmm-btn-blue" style={{ fontSize: '11px', padding: '4px 10px' }}>
                    Claim Spot
                  </button>
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
              Click any row to sponsor / claim
            </span>
          </div>

          <div className="bmm-spots-rows-list">
            {filteredSpots.map((spot) => (
              <div
                key={spot.id}
                className="bmm-spot-row"
                onClick={() => onSpotClick(spot)}
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
                    {formatPrice(spot.topBidEur, spot.topBidUsd)}
                  </span>
                  <span
                    className="bmm-sold-badge"
                    style={{ background: 'rgba(52, 199, 89, 0.12)', color: '#27ae60', borderColor: 'rgba(52, 199, 89, 0.3)' }}
                  >
                    Available
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
};
