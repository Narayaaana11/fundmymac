import React, { useEffect } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import type { DisplayCurrency } from './BrandMyMacNavbar';

interface LeaderboardModalProps {
  isOpen: boolean;
  currency: DisplayCurrency;
  spots: BrandSpot[];
  onClose: () => void;
  onSelectSpot: (spot: BrandSpot) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  currency,
  spots,
  onClose,
  onSelectSpot
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Rank spots by top bid descending
  const sortedSpots = [...spots].sort((a, b) => {
    const valA = currency === 'INR' ? (a.topBidInr || a.topBidUsd * 84) : currency === 'EUR' ? a.topBidEur : a.topBidUsd;
    const valB = currency === 'INR' ? (b.topBidInr || b.topBidUsd * 84) : currency === 'EUR' ? b.topBidEur : b.topBidUsd;
    return valB - valA;
  });

  const formatPrice = (spot: BrandSpot) => {
    if (currency === 'INR') {
      const inr = spot.topBidInr || Math.round(spot.topBidUsd * 84);
      return `₹${inr.toLocaleString('en-IN')}`;
    }
    if (currency === 'EUR') {
      return `${spot.topBidEur.toLocaleString()} €`;
    }
    return `$${spot.topBidUsd.toLocaleString()}`;
  };

  return (
    <div
      className="bmm-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
    >
      <div
        className="bmm-modal-card bmm-leaderboard-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="modal-pill-tag">🏆 OFFICIAL LEADERBOARD</span>
            <h3 id="leaderboard-title" className="bmm-modal-title" style={{ margin: '6px 0 2px' }}>
              Top Brands on the Mac
            </h3>
            <p className="bmm-modal-subtitle" style={{ margin: 0 }}>
              Ranked by highest active bid. All spots permanently featured IRL & online.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bmm-modal-close"
            aria-label="Close dialog"
            style={{ position: 'static' }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Leaderboard List */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sortedSpots.map((spot, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;
              const medalClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'standard';

              return (
                <li
                  key={spot.id}
                  onClick={() => {
                    onClose();
                    onSelectSpot(spot);
                  }}
                  className={`bmm-leaderboard-row ${medalClass}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e5e5ea',
                    background: isTopThree ? 'rgba(0, 113, 227, 0.03)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    {/* Rank badge */}
                    <span
                      style={{
                        display: 'inline-grid',
                        placeItems: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '999px',
                        fontWeight: 700,
                        fontSize: '12px',
                        background:
                          rank === 1
                            ? 'linear-gradient(135deg, #ffd700, #ffa500)'
                            : rank === 2
                            ? 'linear-gradient(135deg, #e0e0e0, #b0b0b0)'
                            : rank === 3
                            ? 'linear-gradient(135deg, #cd7f32, #a0522d)'
                            : '#f2f2f7',
                        color: isTopThree ? '#ffffff' : 'var(--ink)'
                      }}
                    >
                      {rank}
                    </span>

                    {/* Logo or placeholder */}
                    {spot.logoUrl ? (
                      <img
                        src={spot.logoUrl}
                        alt={spot.sponsorName}
                        style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: '#f2f2f7',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '12px',
                          color: '#86868b'
                        }}
                      >
                        #{spot.id}
                      </div>
                    )}

                    {/* Brand info */}
                    <div style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {spot.sponsorName === 'Starting Bid Floor' || spot.sponsorName === 'Prime Marquee Floor'
                          ? `Spot #${spot.id} · ${spot.name}`
                          : spot.sponsorName}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
                        {spot.size} · {spot.surface.toUpperCase()} · {spot.bidCount} {spot.bidCount === 1 ? 'bid' : 'bids'}
                      </span>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#34c759'
                      }}
                      className="tabular-nums"
                    >
                      {formatPrice(spot)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--blue)' }}>
                      Place Bid ›
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
};
