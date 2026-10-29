import React from 'react';

import type { DisplayCurrency } from './BrandMyMacNavbar';

interface CornerWidgetProps {
  currency: DisplayCurrency;
  onClaimCorner: () => void;
}

export const CornerWidget: React.FC<CornerWidgetProps> = ({
  onClaimCorner
}) => {
  return (
    <>
      {/* Floating Desktop Widget */}
      <aside className="bmm-corner-desktop" id="corner">
        <div className="bmm-corner-card" onClick={onClaimCorner}>
          <span className="bmm-corner-paid-tag">Opening Soon</span>
          <img
            src="/logo-small.png"
            alt="The Corner"
            className="bmm-corner-avatar"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="bmm-corner-name">Your Brand Here</span>
          <span className="bmm-corner-claim-hint">
            <strong>Pricing Coming Soon</strong>
          </span>
        </div>

        {/* Info box */}
        <div className="bmm-corner-prev-box">
          <p className="bmm-corner-prev-title">The Sticky Corner</p>
          <p style={{ fontSize: '11px', color: 'var(--ink-2)', lineHeight: 1.4, margin: '6px 0 10px 0' }}>
            Featured on every page view in this sticky widget + linked directly to your website.
          </p>
          <button
            type="button"
            onClick={onClaimCorner}
            className="bmm-btn-blue"
            style={{ width: '100%', fontSize: '12px', minHeight: '36px', padding: '8px 12px' }}
          >
            Coming Soon · Join Waitlist
          </button>
        </div>
      </aside>

      {/* Mobile Fixed Bottom Bar */}
      <div className="bmm-corner-mobile-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/logo-small.png"
            alt="Fund My Mac"
            style={{ width: '28px', height: '28px', borderRadius: '6px' }}
          />
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>
              The Corner Space
            </span>
            <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
              Pricing Coming Soon
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClaimCorner}
          className="bmm-btn-get-spot"
          style={{ fontSize: '12px', padding: '6px 14px' }}
        >
          Coming Soon
        </button>
      </div>
    </>
  );
};
