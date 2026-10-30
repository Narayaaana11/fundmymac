import React, { useState } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import { BRAND_SPOTS } from '../data/fundMyMacData';
import { SpotlightCard } from './SpotlightCard';
import type { DisplayCurrency } from './BrandMyMacNavbar';
import { IS_PUBLIC_PREVIEW } from '../config/previewConfig';

interface AuctionSectionProps {
  currency: DisplayCurrency;
  onSpotClick: (spot: BrandSpot) => void;
  onOpenLeaderboard?: () => void;
  spots?: BrandSpot[];
  isLiveSync?: boolean;
}

export const AuctionSection: React.FC<AuctionSectionProps> = ({
  currency: _currency,
  onSpotClick,
  onOpenLeaderboard,
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

  const totalBidsCount = activeSpots.reduce((acc, s) => acc + s.bidCount, 0);

  const formatPrice = (_eur: number, usd: number, _inr?: number) => {
    if (IS_PUBLIC_PREVIEW) return 'Pricing Coming Soon';
    return `$${usd.toLocaleString()}`;
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
            <span style={{ background: isLiveSync ? '#34c759' : '#0071e3' }} />
            <span style={{ background: isLiveSync ? 'rgba(52, 199, 89, 0.4)' : 'rgba(0, 113, 227, 0.4)' }} />
          </span>
          <span>
            {IS_PUBLIC_PREVIEW
              ? `· ${openSpotsCount} of ${activeSpots.length} Sticker Spaces in Public Preview`
              : `· ${openSpotsCount} of ${activeSpots.length} Sticker Spaces in Live Auction`}
          </span>
          <span className="bmm-badge-divider">|</span>
          <span className="bmm-bids-count-pill tabular-nums">
            {IS_PUBLIC_PREVIEW ? 'Waitlist Open' : `${totalBidsCount} ${totalBidsCount === 1 ? 'bid' : 'bids'} total`}
          </span>
        </div>

        <h2 className="bmm-auction-h2">
          {IS_PUBLIC_PREVIEW ? 'Sponsorship Spaces & Positions.' : 'The Live Auction.'}
        </h2>
        <p className="bmm-auction-desc">
          {IS_PUBLIC_PREVIEW
            ? 'Inspect each of our 20 aluminum sponsorship spots, physical dimensions, and placements. Click any spot to join the priority waitlist.'
            : 'Every space shows its current top bid. Click any spot to inspect perks and place your bid with a 20% commitment deposit.'}
        </p>
        <p className="bmm-auction-pricing-note">
          {IS_PUBLIC_PREVIEW ? (
            <>
              🔒 <strong>Public Preview Active:</strong> Official pricing will be revealed upon live checkout activation pending Razorpay merchant approval. Register for any spot below to secure priority notification.
            </>
          ) : (
            <>
              Starting floors from <strong>{formatPrice(125, 135, 11300)} Small</strong> ·{' '}
              <strong>{formatPrice(200, 215, 18000)} Medium</strong> ·{' '}
              <strong>{formatPrice(400, 430, 36000)} Marquee</strong>. Minimum outbid increment:{' '}
              <strong>+{formatPrice(10, 10, 800)}</strong>. Outbid deposits automatically refunded in full.
            </>
          )}
        </p>

        {/* Featured Prime Positions SpotlightCard */}
        <SpotlightCard className="bmm-leaderboard-card" spotlightColor="rgba(0, 113, 227, 0.12)">
          <div className="bmm-leaderboard-head">
            <h3 className="bmm-leaderboard-title">Top Prime Positions</h3>
            {onOpenLeaderboard ? (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="bmm-leaderboard-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Full Leaderboard →
              </button>
            ) : (
              <span className="bmm-leaderboard-link">Highest IRL Visibility →</span>
            )}
          </div>

          <ol className="bmm-leaderboard-list">
            {primeSpots.map((spot, idx) => (
              <li
                key={spot.id}
                data-spot-id={spot.id}
                aria-label={`Inspect Prime Spot #${spot.id}: ${spot.name}`}
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
                  <span className="bmm-leaderboard-amount tabular-nums" style={{ color: '#0071e3', fontWeight: 600 }}>
                    {formatPrice(spot.topBidEur, spot.topBidUsd, spot.topBidInr)}
                  </span>
                  {spot.isSold ? (
                    <span
                      className="bmm-sold-badge"
                      style={{ background: 'rgba(255, 69, 58, 0.12)', color: '#ff453a', borderColor: 'rgba(255, 69, 58, 0.3)' }}
                    >
                      Sold
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
                      {IS_PUBLIC_PREVIEW ? 'Waitlist ›' : 'Bid ›'}
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
              All Spots Directory ({filteredSpots.length} spaces)
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
              Click any spot to inspect dimensions & join priority waitlist
            </span>
          </div>

          <div className="bmm-spots-rows-list">
            {filteredSpots.map((spot) => (
              <div
                key={spot.id}
                data-spot-id={spot.id}
                aria-label={`Inspect Spot #${spot.id}: ${spot.name}`}
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
                    <span className="bmm-row-sponsor">
                      {spot.sponsorName === 'Starting Bid Floor' || spot.sponsorName === 'Prime Marquee Floor'
                        ? spot.name
                        : spot.sponsorName}
                    </span>
                    <span className="bmm-row-meta">
                      {spot.size} · {spot.dimensions} — {spot.location}
                      {spot.bidCount > 0 && ` · ${spot.bidCount} bids`}
                    </span>
                  </div>
                </div>

                <div className="bmm-spot-row-right">
                  <span className="bmm-leaderboard-amount tabular-nums" style={{ color: '#0071e3', fontWeight: 600 }}>
                    {formatPrice(spot.topBidEur, spot.topBidUsd, spot.topBidInr)}
                  </span>
                  {spot.isSold ? (
                    <span
                      className="bmm-sold-badge"
                      style={{ background: 'rgba(255, 69, 58, 0.12)', color: '#ff453a', borderColor: 'rgba(255, 69, 58, 0.3)' }}
                    >
                      Sold
                    </span>
                  ) : (
                    <span
                      className="bmm-sold-badge"
                      style={{ background: 'rgba(0, 113, 227, 0.1)', color: '#0071e3', borderColor: 'rgba(0, 113, 227, 0.25)' }}
                    >
                      {IS_PUBLIC_PREVIEW ? 'Waitlist Open' : spot.bidCount > 0 ? `${spot.bidCount} bids` : 'Floor Price'}
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
