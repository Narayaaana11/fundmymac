import type { DisplayCurrency } from './BrandMyMacNavbar';
import type { CornerState } from '../data/fundMyMacData';

interface CornerWidgetProps {
  currency: DisplayCurrency;
  cornerData: CornerState;
  onClaimCorner: () => void;
}

export const CornerWidget: React.FC<CornerWidgetProps> = ({
  currency: _currency,
  cornerData,
  onClaimCorner
}) => {
  const currentPaid = cornerData.amountUsd > 0
    ? `paid $${cornerData.amountUsd}`
    : 'Available';

  const nextPrice = `$${cornerData.nextBidUsd || 45}`;

  return (
    <>
      {/* Floating Desktop Widget */}
      <aside className="bmm-corner-desktop" id="corner-desktop-widget">
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

          <span className="bmm-corner-prev-title">PREVIOUSLY HERE</span>
          <div className="bmm-corner-prev-list">
            {cornerData.history.length > 0 ? (
              cornerData.history.slice(0, 4).map((item, idx) => (
                <div key={idx} className="bmm-corner-prev-item">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bmm-corner-prev-link"
                  >
                    <img
                      src={item.avatarUrl || '/logo-small.png'}
                      alt={item.name}
                      className="bmm-corner-prev-avatar"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span>{item.name}</span>
                  </a>
                  <span className="bmm-corner-prev-held">
                    {item.held}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--ink-2)', padding: '4px 0' }}>
                No previous sponsors yet. Be the first to claim the corner!
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Corner Banner */}
      <div className="bmm-corner-mobile">
        <div className="bmm-corner-mobile-inner">
          <div className="bmm-corner-mobile-left" onClick={onClaimCorner}>
            <img
              src={cornerData.avatarUrl || '/logo-small.png'}
              alt={cornerData.currentSponsor}
              className="bmm-corner-avatar"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="bmm-corner-mobile-text">
              <span className="bmm-corner-mobile-label">THE CORNER SPOT</span>
              <span className="bmm-corner-mobile-name">{cornerData.currentSponsor}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClaimCorner}
            className="bmm-btn-get-spot"
            style={{ fontSize: '12px', minHeight: '32px', padding: '4px 12px' }}
          >
            Claim — {nextPrice}
          </button>
        </div>
      </div>
    </>
  );
};
