import React from 'react';
import type { DisplayCurrency } from './BrandMyMacNavbar';
import type { CornerState } from '../data/fundMyMacData';

interface CornerWidgetProps {
  currency: DisplayCurrency;
  cornerData: CornerState;
  onClaimCorner: () => void;
}

export const CornerWidget: React.FC<CornerWidgetProps> = ({
  currency,
  cornerData,
  onClaimCorner
}) => {
  const currentPaid =
    currency === 'INR'
      ? `paid ₹${cornerData.amountInr.toLocaleString('en-IN')}`
      : currency === 'EUR'
      ? `paid ${cornerData.amountEur} €`
      : `paid $${cornerData.amountUsd}`;

  const nextPrice =
    currency === 'INR'
      ? `₹${cornerData.nextBidInr.toLocaleString('en-IN')}`
      : currency === 'EUR'
      ? `${cornerData.nextBidEur} €`
      : `$${cornerData.nextBidUsd}`;

  return (
    <>
      {/* Floating Desktop Widget */}
      <aside className="bmm-corner-desktop" id="corner">
        <div className="bmm-corner-card" onClick={onClaimCorner}>
          <span className="bmm-corner-paid-tag">{currentPaid}</span>
          <img
            src={cornerData.avatarUrl || '/logo-small.png'}
            alt={cornerData.currentSponsor}
            className="bmm-corner-avatar"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="bmm-corner-name">{cornerData.currentSponsor}</span>
          <span className="bmm-corner-claim-hint">
            Claim this spot for <strong style={{ color: 'var(--blue)' }}>{nextPrice}</strong>
          </span>
        </div>

        {/* Hover Takeover Box */}
        <div className="bmm-corner-prev-box">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={onClaimCorner}
              className="bmm-btn-blue"
              style={{ flex: 1, fontSize: '12px', minHeight: '32px', padding: '6px 12px' }}
            >
              Claim — {nextPrice}
            </button>
            {cornerData.currentUrl && (
              <a
                href={cornerData.currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bmm-btn-outline"
                style={{
                  fontSize: '11px',
                  padding: '6px 10px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: '999px'
                }}
              >
                Visit ↗
              </a>
            )}
          </div>

          <p className="bmm-corner-prev-title">PREVIOUSLY HERE</p>
          <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {cornerData.history && cornerData.history.length > 0 ? (
              cornerData.history.map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--ink)', textDecoration: 'none', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}
                  >
                    {item.name}
                  </a>
                  <span style={{ color: 'var(--ink-2)', fontSize: '10px' }} className="tabular-nums">
                    {item.held}
                  </span>
                </li>
              ))
            ) : (
              <li style={{ fontSize: '11px', color: 'var(--ink-2)' }}>No past outbids yet.</li>
            )}
          </ul>
        </div>
      </aside>

      {/* Mobile Fixed Bottom Bar */}
      <div className="bmm-corner-mobile-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src={cornerData.avatarUrl || '/logo-small.png'}
            alt={cornerData.currentSponsor}
            style={{ width: '28px', height: '28px', borderRadius: '6px' }}
          />
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>
              {cornerData.currentSponsor}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
              {currentPaid} · <span style={{ color: 'var(--blue)' }}>Claim for {nextPrice}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClaimCorner}
          className="bmm-btn-get-spot"
          style={{ fontSize: '12px', padding: '6px 14px' }}
        >
          Claim Corner
        </button>
      </div>
    </>
  );
};
