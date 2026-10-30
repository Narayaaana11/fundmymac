import React, { useState, useRef } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import { BRAND_SPOTS } from '../data/fundMyMacData';
import type { DisplayCurrency } from './BrandMyMacNavbar';

interface MacbookDisplayProps {
  currency: DisplayCurrency;
  onSpotClick: (spot: BrandSpot) => void;
  spots?: BrandSpot[];
}

const getInsideSpotPosition = (id: number) => {
  switch (id) {
    case 11: // Left Palm Rest — Outer Top
      return { left: '7%', top: '60%' };
    case 12: // Left Palm Rest — Outer Bottom
      return { left: '7%', top: '78%' };
    case 13: // Left Palm Rest — Inner Top
      return { left: '19.8%', top: '60%' };
    case 14: // Left Palm Rest — Inner Bottom
      return { left: '19.8%', top: '78%' };
    case 15: // Right Palm Rest — Inner Top
      return { left: '69%', top: '60%' };
    case 16: // Right Palm Rest — Inner Bottom
      return { left: '69%', top: '78%' };
    case 17: // Right Palm Rest — Outer Top
      return { left: '81.8%', top: '60%' };
    case 18: // Right Palm Rest — Outer Bottom
      return { left: '81.8%', top: '78%' };
    default:
      return { left: '0%', top: '0%' };
  }
};

export const MacbookDisplay: React.FC<MacbookDisplayProps> = ({
  currency: _currency,
  onSpotClick,
  spots
}) => {
  const [surface, setSurface] = useState<'lid' | 'inside'>('lid');
  const [viewMode, setViewMode] = useState<'auction' | 'final'>('auction');

  // React Bits Inspired 3D Tilt State
  const chassisRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number; lightX: number; lightY: number }>({
    x: 0,
    y: 0,
    lightX: 50,
    lightY: 50
  });
  const [isHovered, setIsHovered] = useState(false);

  // Logo Preview Simulation State (Across All Spots on the MacBook)
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [previewTargetSpotId, setPreviewTargetSpotId] = useState<number | 'all'>('all');
  const [showLogoTester, setShowLogoTester] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSpots = spots || BRAND_SPOTS;
  const lidSpots = activeSpots.filter((s) => s.surface === 'lid');
  const insideSpots = activeSpots.filter((s) => s.surface === 'inside');
  const chargerSpot = activeSpots.find((s) => s.id === 19) || BRAND_SPOTS.find((s) => s.id === 19)!;
  const mouseSpot = activeSpots.find((s) => s.id === 20) || BRAND_SPOTS.find((s) => s.id === 20)!;

  const shouldShowPreviewLogo = (spotId: number) => {
    if (!previewLogo) return false;
    const spot = activeSpots.find((s) => s.id === spotId);
    if (spot?.isSold && spot?.logoUrl) return false;
    if (previewTargetSpotId === 'all') return true;
    return previewTargetSpotId === spotId;
  };

  const formatPrice = (_eur?: number, usd: number = 0, _inr?: number) => {
    return `$${usd.toLocaleString()}`;
  };

  // Cursor-based 3D tilt handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chassisRef.current) return;
    const rect = chassisRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -7; // max 7 deg
    const rotateY = ((x - centerX) / centerX) * 7;

    const lightX = (x / rect.width) * 100;
    const lightY = (y / rect.height) * 100;

    setTilt({ x: rotateX, y: rotateY, lightX, lightY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0, lightX: 30, lightY: 0 });
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setPreviewLogo(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bmm-stage-container">
      {/* Surface Selector Pill (Lid / Inside) */}
      <div className="bmm-toggle-row" id="macbook-controls">
        <div role="group" aria-label="Side of the machine" className="bmm-pill-toggle">
          <button
            type="button"
            aria-pressed={surface === 'lid'}
            onClick={() => setSurface('lid')}
            className={`bmm-pill-btn ${surface === 'lid' ? 'active' : ''}`}
          >
            Lid
          </button>
          <button
            type="button"
            aria-pressed={surface === 'inside'}
            onClick={() => setSurface('inside')}
            className={`bmm-pill-btn ${surface === 'inside' ? 'active' : ''}`}
          >
            Inside
          </button>
        </div>

        {/* Live Logo Try-On Tool Toggle */}
        <button
          type="button"
          onClick={() => setShowLogoTester(!showLogoTester)}
          className="bmm-try-logo-pill-btn"
          title="Simulate your brand sticker on the MacBook"
        >
          <span>✨ Test Your Logo</span>
        </button>
      </div>

      {/* Floating Logo Testing Bar (React Bits Inspired) */}
      {showLogoTester && (
        <div className="bmm-logo-tester-bar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
            <div className="tester-samples" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className="tester-hint-title" style={{ fontSize: '12px', fontWeight: 600 }}>Test Any Logo:</span>
              {[
                { name: 'Stripe', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 25"><text y="20" font-size="20" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="bold" fill="%23635bff">stripe</text></svg>' },
                { name: 'Supabase', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%233ecf8e" d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.424a.396.396 0 0 0 .319.638H12v8.958a.396.396 0 0 0 .716.233l9.081-12.261a.396.396 0 0 0-.319-.638z"/></svg>' },
                { name: 'Vercel', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23000" d="M12 1L24 22H0L12 1z"/></svg>' }
              ].map((sample) => (
                <button
                  key={sample.name}
                  type="button"
                  onClick={() => setPreviewLogo(sample.url)}
                  className={`tester-sample-chip ${previewLogo === sample.url ? 'active' : ''}`}
                >
                  {sample.name}
                </button>
              ))}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCustomUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="tester-upload-chip"
                style={{ background: '#0071e3', color: '#fff', border: 'none' }}
              >
                📁 Upload Custom Logo
              </button>

              {previewLogo && (
                <button
                  type="button"
                  onClick={() => setPreviewLogo(null)}
                  className="tester-reset-chip"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Target Spot Selector (All Spots vs Specific Spot) */}
            {previewLogo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>Preview Placement:</span>
                <button
                  type="button"
                  onClick={() => setPreviewTargetSpotId('all')}
                  className={`tester-sample-chip ${previewTargetSpotId === 'all' ? 'active' : ''}`}
                >
                  🌐 All Open Spots
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTargetSpotId(2)}
                  className={`tester-sample-chip ${previewTargetSpotId === 2 ? 'active' : ''}`}
                >
                  #2 Marquee
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTargetSpotId(1)}
                  className={`tester-sample-chip ${previewTargetSpotId === 1 ? 'active' : ''}`}
                >
                  #1 Top Left
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewTargetSpotId(13);
                    setSurface('inside');
                  }}
                  className={`tester-sample-chip ${previewTargetSpotId === 13 ? 'active' : ''}`}
                >
                  #13 Palm Rest
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowLogoTester(false)}
              className="tester-close-btn"
              aria-label="Close logo preview tool"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: '14px', color: 'var(--ink-2)' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main MacBook Stage with 3D Perspective Tilt */}
      <div className="bmm-macbook-stage">
        <div className="bmm-macbook-wrap">
          {surface === 'lid' ? (
            /* --- LID VIEW WITH 3D TILT --- */
            <div
              ref={chassisRef}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={handleMouseLeave}
              className="bmm-lid-chassis"
              style={{
                transform: isHovered
                  ? `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.01, 1.01, 1.01)`
                  : 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                transition: isHovered ? 'none' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Dynamic Light Specular Reflection following cursor */}
              <div
                className="bmm-lid-specular"
                aria-hidden="true"
                style={{
                  background: isHovered
                    ? `radial-gradient(100% 80% at ${tilt.lightX}% ${tilt.lightY}%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.15) 38%, transparent 70%)`
                    : undefined
                }}
              />

              {/* Specular Apple Logo in Center */}
              <div className="bmm-apple-logo-center">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="bmm-apple-logo-svg"
                  fill="currentColor"
                >
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.033 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                </svg>
              </div>

              {/* 6x3 Grid of 10 Lid Spots */}
              <div className="bmm-lid-grid">
                {lidSpots.map((spot) => (
                  <div
                    key={spot.id}
                    data-spot-id={spot.id}
                    onClick={() => onSpotClick(spot)}
                    className={`bmm-spot-box ${viewMode === 'final' && !spot.isSold && !spot.logoUrl && !shouldShowPreviewLogo(spot.id) ? 'is-final-mode' : ''}`}
                    style={{
                      gridColumn: spot.gridColumn,
                      gridRow: spot.gridRow
                    }}
                    title={`${spot.name} — ${spot.sponsorName} (${formatPrice(spot.topBidEur, spot.topBidUsd, spot.topBidInr)})`}
                  >
                    <div className="bmm-spot-content">
                      <div className="bmm-spot-logo-wrap">
                        {shouldShowPreviewLogo(spot.id) ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <img
                              src={previewLogo!}
                              alt="Live Tested Logo"
                              className="bmm-spot-logo animate-pulse"
                              style={{ maxHeight: '38px', maxWidth: '85%', objectFit: 'contain' }}
                            />
                            <span style={{ fontSize: '9px', color: '#0071e3', fontWeight: 600, marginTop: '2px' }}>
                              Preview
                            </span>
                          </div>
                        ) : spot.logoUrl ? (
                          <img
                            src={spot.logoUrl}
                            alt={spot.sponsorName}
                            className="bmm-spot-logo"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="bmm-spot-sponsor-title">
                            {viewMode === 'final' ? '' : (spot.isSold ? spot.sponsorName : (spot.id === 2 ? 'Prime Marquee' : 'Open Spot'))}
                          </span>
                        )}
                      </div>

                      {viewMode === 'auction' && (
                        <span className="bmm-spot-price-tag">
                          {formatPrice(spot.topBidEur, spot.topBidUsd, spot.topBidInr)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* --- INSIDE / KEYBOARD VIEW (PHOTO REALISTIC) --- */
            <div
              ref={chassisRef}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={handleMouseLeave}
              className="bmm-inside-chassis"
              style={{
                transform: isHovered
                  ? `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.01, 1.01, 1.01)`
                  : 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                transition: isHovered ? 'none' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <img
                src="/inside.webp"
                alt="MacBook Pro Inside Keyboard and Trackpad"
                className="bmm-inside-img"
              />

              {/* 8 Palm Rest Spots (11-18) positioned precisely over palm rests */}
              {insideSpots.map((spot) => {
                const pos = getInsideSpotPosition(spot.id);
                return (
                  <div
                    key={spot.id}
                    data-spot-id={spot.id}
                    onClick={() => onSpotClick(spot)}
                    className={`bmm-spot-box bmm-inside-spot ${viewMode === 'final' && !spot.isSold && !spot.logoUrl && !shouldShowPreviewLogo(spot.id) ? 'is-final-mode' : ''}`}
                    style={{
                      left: pos.left,
                      top: pos.top,
                      width: '11.4%',
                      height: '15.5%'
                    }}
                    title={`${spot.name} — ${spot.sponsorName} (${formatPrice(spot.topBidEur, spot.topBidUsd)})`}
                  >
                    <div className="bmm-spot-content" style={{ padding: '4px' }}>
                      <div className="bmm-spot-logo-wrap">
                        {shouldShowPreviewLogo(spot.id) ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <img
                              src={previewLogo!}
                              alt="Live Tested Logo"
                              className="bmm-spot-logo animate-pulse"
                              style={{ maxHeight: '28px', maxWidth: '80%', objectFit: 'contain' }}
                            />
                            <span style={{ fontSize: '8px', color: '#0071e3', fontWeight: 600 }}>
                              Preview
                            </span>
                          </div>
                        ) : spot.logoUrl ? (
                          <img
                            src={spot.logoUrl}
                            alt={spot.sponsorName}
                            className="bmm-spot-logo"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span
                            className="bmm-spot-sponsor-title"
                            style={{
                              fontSize: '10px',
                              textAlign: 'center',
                              lineHeight: 1.15
                            }}
                          >
                            {viewMode === 'final' ? '' : (spot.isSold ? spot.sponsorName : 'Open Spot')}
                          </span>
                        )}
                      </div>

                      {viewMode === 'auction' && (
                        <span
                          className="bmm-spot-price-tag"
                          style={{ fontSize: '11px' }}
                        >
                          {formatPrice(spot.topBidEur, spot.topBidUsd, spot.topBidInr)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Side Floating Charger */}
          <div className="bmm-charger-side">
            <p className="bmm-accessory-label">charger + cable</p>
            <div className="bmm-charger-inner">
              <img src="/charger.webp" alt="Charger" />
              <div
                className="bmm-charger-spot-overlay"
                onClick={() => onSpotClick(chargerSpot)}
              >
                <div data-spot-id={chargerSpot.id} className={`bmm-spot-box ${viewMode === 'final' && !chargerSpot.isSold && !chargerSpot.logoUrl && !shouldShowPreviewLogo(chargerSpot.id) ? 'is-final-mode' : ''}`} style={{ height: '100%', width: '100%' }}>
                  <div className="bmm-spot-content" style={{ padding: '4px' }}>
                    {shouldShowPreviewLogo(chargerSpot.id) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={previewLogo!} alt="Preview" className="bmm-spot-logo animate-pulse" style={{ maxHeight: '34px', objectFit: 'contain' }} />
                        <span style={{ fontSize: '9px', color: '#0071e3', fontWeight: 600 }}>Preview</span>
                      </div>
                    ) : chargerSpot.logoUrl ? (
                      <img src={chargerSpot.logoUrl} alt={chargerSpot.name} className="bmm-spot-logo" />
                    ) : (
                      <span className="bmm-spot-sponsor-title">
                        {viewMode === 'final' ? '' : 'Charger · Available'}
                      </span>
                    )}
                    {viewMode === 'auction' && (
                      <span className="bmm-spot-price-tag">
                        {formatPrice(chargerSpot.topBidEur, chargerSpot.topBidUsd, chargerSpot.topBidInr)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Floating Magic Mouse */}
          <div className="bmm-mouse-side">
            <p className="bmm-accessory-label">Magic Mouse</p>
            <div className="bmm-mouse-inner">
              <img src="/magicmouse.webp" alt="Magic Mouse" />
              <div
                className="bmm-mouse-spot-overlay"
                onClick={() => onSpotClick(mouseSpot)}
              >
                <div data-spot-id={mouseSpot.id} className={`bmm-spot-box ${viewMode === 'final' && !mouseSpot.isSold && !mouseSpot.logoUrl && !shouldShowPreviewLogo(mouseSpot.id) ? 'is-final-mode' : ''}`} style={{ height: '100%', width: '100%' }}>
                  <div className="bmm-spot-content" style={{ padding: '4px' }}>
                    {shouldShowPreviewLogo(mouseSpot.id) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={previewLogo!} alt="Preview" className="bmm-spot-logo animate-pulse" style={{ maxHeight: '34px', objectFit: 'contain' }} />
                        <span style={{ fontSize: '9px', color: '#0071e3', fontWeight: 600 }}>Preview</span>
                      </div>
                    ) : mouseSpot.logoUrl ? (
                      <img src={mouseSpot.logoUrl} alt={mouseSpot.name} className="bmm-spot-logo" />
                    ) : (
                      <span className="bmm-spot-sponsor-title">
                        {viewMode === 'final' ? '' : 'Mouse · Available'}
                      </span>
                    )}
                    {viewMode === 'auction' && (
                      <span className="bmm-spot-price-tag">
                        {formatPrice(mouseSpot.topBidEur, mouseSpot.topBidUsd, mouseSpot.topBidInr)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ground Soft Shadow */}
          <div className="bmm-mac-shadow" aria-hidden="true" />
        </div>
      </div>

      {/* Mobile Accessories Section (Shown on screens <= 1280px) */}
      <div className="bmm-mobile-accessories-row">
        {/* Spot #19: Charger */}
        <div
          className="bmm-mobile-acc-card"
          onClick={() => onSpotClick(chargerSpot)}
          title={`${chargerSpot.name} (${formatPrice(chargerSpot.topBidEur, chargerSpot.topBidUsd, chargerSpot.topBidInr)})`}
        >
          <span className="bmm-mobile-acc-label">charger + cable · spot #19</span>
          <div className="bmm-mobile-acc-img-wrap" style={{ position: 'relative' }}>
            <img src="/charger.webp" alt="Fast Charger" />
            {shouldShowPreviewLogo(chargerSpot.id) && (
              <img
                src={previewLogo!}
                alt="Preview"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  maxHeight: '36px',
                  maxWidth: '70px',
                  objectFit: 'contain'
                }}
              />
            )}
          </div>
          <span className="bmm-mobile-acc-status">
            {shouldShowPreviewLogo(chargerSpot.id) ? '✨ Previewing Your Logo' : chargerSpot.isSold ? `Sponsored by ${chargerSpot.sponsorName}` : formatPrice(chargerSpot.topBidEur, chargerSpot.topBidUsd, chargerSpot.topBidInr)}
          </span>
        </div>

        {/* Spot #20: Magic Mouse */}
        <div
          className="bmm-mobile-acc-card"
          onClick={() => onSpotClick(mouseSpot)}
          title={`${mouseSpot.name} (${formatPrice(mouseSpot.topBidEur, mouseSpot.topBidUsd, mouseSpot.topBidInr)})`}
        >
          <span className="bmm-mobile-acc-label">Magic Mouse · spot #20</span>
          <div className="bmm-mobile-acc-img-wrap" style={{ position: 'relative' }}>
            <img src="/magicmouse.webp" alt="Magic Mouse" />
            {shouldShowPreviewLogo(mouseSpot.id) && (
              <img
                src={previewLogo!}
                alt="Preview"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  maxHeight: '36px',
                  maxWidth: '70px',
                  objectFit: 'contain'
                }}
              />
            )}
          </div>
          <span className="bmm-mobile-acc-status">
            {shouldShowPreviewLogo(mouseSpot.id) ? '✨ Previewing Your Logo' : mouseSpot.isSold ? `Sponsored by ${mouseSpot.sponsorName}` : formatPrice(mouseSpot.topBidEur, mouseSpot.topBidUsd, mouseSpot.topBidInr)}
          </span>
        </div>
      </div>

      {/* Sub Toggle (The auction / Final look) */}
      <div className="bmm-sub-toggle-row">
        <div role="group" aria-label="Machine view" className="bmm-pill-toggle">
          <button
            type="button"
            aria-pressed={viewMode === 'auction'}
            onClick={() => setViewMode('auction')}
            className={`bmm-pill-btn ${viewMode === 'auction' ? 'active' : ''}`}
          >
            Sponsorship Spaces
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'final'}
            onClick={() => setViewMode('final')}
            className={`bmm-pill-btn ${viewMode === 'final' ? 'active' : ''}`}
          >
            Final look
          </button>
        </div>
        <p className="bmm-tap-hint">Tap any space to inspect placement perks and place your bid.</p>
      </div>
    </div>
  );
};
