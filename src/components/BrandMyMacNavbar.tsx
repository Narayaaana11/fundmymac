import React, { useState } from 'react';

interface BrandMyMacNavbarProps {
  currency: 'EUR' | 'USD';
  onToggleCurrency: (c: 'EUR' | 'USD') => void;
  onGetSpotClick: () => void;
}

export const BrandMyMacNavbar: React.FC<BrandMyMacNavbarProps> = ({
  currency,
  onToggleCurrency,
  onGetSpotClick
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navLinks = [
    { label: 'The Machine', href: '#macbook-showcase' },
    { label: 'The Mission', href: '#vesper-mission' },
    { label: 'IRL Events', href: '#events' },
    { label: 'Sponsors Wall', href: '#sponsors' },
    { label: 'Tiers', href: '#sponsor-tiers' },
    { label: 'FAQ', href: '#faq' }
  ];

  const handleLinkClick = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      <nav className="bmm-nav">
        <div className="bmm-nav-inner">
          {/* Brand link */}
          <a href="#" className="bmm-brand-link">
            <img
              src="/logo-small.png"
              alt="Fund My Mac"
              className="bmm-brand-logo"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>Fund My Mac</strong>
              <span className="bmm-nav-vesper-tag">by VESPER</span>
            </span>
          </a>

          {/* Desktop Center links */}
          <div className="bmm-nav-links">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>

          {/* Right side currency & CTA */}
          <div className="bmm-nav-right">
            <div role="group" aria-label="Display currency" className="bmm-currency-switch">
              <button
                type="button"
                onClick={() => onToggleCurrency('EUR')}
                aria-pressed={currency === 'EUR'}
                className={`bmm-curr-btn ${currency === 'EUR' ? 'active' : ''}`}
              >
                €
              </button>
              <button
                type="button"
                onClick={() => onToggleCurrency('USD')}
                aria-pressed={currency === 'USD'}
                className={`bmm-curr-btn ${currency === 'USD' ? 'active' : ''}`}
              >
                $
              </button>
            </div>

            <button
              type="button"
              onClick={onGetSpotClick}
              className="bmm-btn-get-spot"
            >
              Fund This Mac
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="bmm-nav-hamburger"
              aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileOpen}
            >
              {isMobileOpen ? (
                <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Dropdown */}
      {isMobileOpen && (
        <div className="bmm-mobile-drawer">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={handleLinkClick}
              className="bmm-mobile-drawer-link"
            >
              <span>{link.label}</span>
              <span style={{ color: 'var(--ink-2)', fontSize: '13px' }}>›</span>
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setIsMobileOpen(false);
              onGetSpotClick();
            }}
            className="bmm-btn-blue"
            style={{ width: '100%', padding: '10px 0', marginTop: '6px' }}
          >
            💖 Fund This Mac / Claim Spot
          </button>
        </div>
      )}
    </>
  );
};
