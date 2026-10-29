import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import type { BrandSpot, SponsorTier } from './data/fundMyMacData';
import { FUNDING_GOAL, BRAND_SPOTS } from './data/fundMyMacData';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { BrandMyMacNavbar } from './components/BrandMyMacNavbar';
import { CornerWidget } from './components/CornerWidget';
import { MacbookDisplay } from './components/MacbookDisplay';
import { VesperMission } from './components/VesperMission';
import { EventsRoadmap } from './components/EventsRoadmap';
import { SponsorsWall } from './components/SponsorsWall';
import { AuctionSection } from './components/AuctionSection';
import { HowItWorks } from './components/HowItWorks';
import { MachineSpecs } from './components/MachineSpecs';
import { FAQSection } from './components/FAQSection';
import { BrandMyMacFooter } from './components/BrandMyMacFooter';
import { BidModal } from './components/BidModal';
import { DonationModal } from './components/DonationModal';
import { CheckoutVerificationModal } from './components/CheckoutVerificationModal';
import { LiveActivityTicker } from './components/LiveActivityTicker';
import { RealtimeMetricsRow } from './components/RealtimeMetricsRow';

export const App: React.FC = () => {
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('USD');
  const [selectedSpot, setSelectedSpot] = useState<BrandSpot | null>(null);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SponsorTier | null>(null);

  // Return from checkout session (verified via server)
  const [checkoutReturn, setCheckoutReturn] = useState<{
    sessionId: string;
    status: string;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const status = urlParams.get('status');
    return sessionId && status ? { sessionId, status } : null;
  });

  // Canonical database-backed spots state (never client-authoritative)
  const [spots, setSpots] = useState<BrandSpot[]>(BRAND_SPOTS);

  // Canonical verified financial progress from captured transactions
  const [raisedUsd, setRaisedUsd] = useState<number>(FUNDING_GOAL.raisedUsd);
  const [raisedEur, setRaisedEur] = useState<number>(FUNDING_GOAL.raisedEur);

  const clearCheckoutUrlParams = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('session_id');
      url.searchParams.delete('status');
      url.searchParams.delete('amount');
      url.searchParams.delete('curr');
      window.history.replaceState({}, document.title, url.pathname + url.hash);
    }
    setCheckoutReturn(null);
  }, []);

  // Fetch canonical state from database
  const refreshCanonicalData = useCallback(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    // 1. Fetch spots status
    client
      .from('brand_spots')
      .select('*')
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return;
        setSpots((prev) =>
          prev.map((s) => {
            const dbSpot = data.find((d: { id: number }) => d.id === s.id);
            if (!dbSpot) return s;
            return {
              ...s,
              isSold: Boolean(dbSpot.is_sold || dbSpot.status === 'sold'),
              sponsorName: dbSpot.sponsor_name || s.sponsorName,
              sponsorUrl: dbSpot.sponsor_url || s.sponsorUrl,
              logoUrl: dbSpot.logo_url || s.logoUrl,
              topBidUsd: dbSpot.price_usd_cents ? Math.round(dbSpot.price_usd_cents / 100) : (dbSpot.top_bid_usd || s.topBidUsd),
              topBidEur: dbSpot.price_eur_cents ? Math.round(dbSpot.price_eur_cents / 100) : (dbSpot.top_bid_eur || s.topBidEur)
            };
          })
        );
      });

    // 2. Fetch canonical financial totals strictly from site_stats
    client
      .from('site_stats')
      .select('total_raised_usd_cents, total_raised_eur_cents')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return;
        if (typeof data.total_raised_usd_cents === 'number') {
          setRaisedUsd(Math.round(data.total_raised_usd_cents / 100));
        }
        if (typeof data.total_raised_eur_cents === 'number') {
          setRaisedEur(Math.round(data.total_raised_eur_cents / 100));
        }
      });
  }, []);

  useEffect(() => {
    refreshCanonicalData();

    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    let isMounted = true;

    // Listen to real-time changes
    const syncChannel = client
      .channel('fundmymac_live_state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_spots' }, (payload) => {
        if (!isMounted) return;
        const newRecord = payload.new as {
          id?: number;
          status?: string;
          is_sold?: boolean;
          sponsor_name?: string;
          sponsor_url?: string;
          logo_url?: string;
          price_usd_cents?: number;
          price_eur_cents?: number;
        };
        if (newRecord && typeof newRecord.id === 'number') {
          setSpots((prev) =>
            prev.map((s) =>
              s.id === newRecord.id
                ? {
                    ...s,
                    isSold: Boolean(newRecord.is_sold || newRecord.status === 'sold'),
                    sponsorName: newRecord.sponsor_name || s.sponsorName,
                    sponsorUrl: newRecord.sponsor_url || s.sponsorUrl,
                    logoUrl: newRecord.logo_url || s.logoUrl,
                    topBidUsd: newRecord.price_usd_cents ? Math.round(newRecord.price_usd_cents / 100) : s.topBidUsd,
                    topBidEur: newRecord.price_eur_cents ? Math.round(newRecord.price_eur_cents / 100) : s.topBidEur
                  }
                : s
            )
          );
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_stats' }, (payload) => {
        if (!isMounted) return;
        const newStats = payload.new as {
          total_raised_usd_cents?: number;
          total_raised_eur_cents?: number;
        };
        if (newStats) {
          if (typeof newStats.total_raised_usd_cents === 'number') {
            setRaisedUsd(Math.round(newStats.total_raised_usd_cents / 100));
          }
          if (typeof newStats.total_raised_eur_cents === 'number') {
            setRaisedEur(Math.round(newStats.total_raised_eur_cents / 100));
          }
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      client.removeChannel(syncChannel);
    };
  }, [refreshCanonicalData]);

  const totalRaised = currency === 'EUR'
    ? `${raisedEur.toLocaleString()} €`
    : `$${raisedUsd.toLocaleString()}`;

  const percentProgress = Math.round(
    (raisedUsd / FUNDING_GOAL.targetUsd) * 100
  );

  const handleSpotClick = (spot: BrandSpot) => {
    setSelectedSpot(spot);
  };

  const handleOpenDonate = (tier?: SponsorTier) => {
    setSelectedTier(tier || null);
    setIsDonationModalOpen(true);
  };

  return (
    <div className="bmm-page">
      {/* Sticky Top Navbar */}
      <BrandMyMacNavbar
        currency={currency}
        onToggleCurrency={setCurrency}
        onGetSpotClick={() => handleOpenDonate()}
      />

      {/* Floating 'The Corner' Widget */}
      <CornerWidget
        currency={currency}
        onClaimCorner={() => handleOpenDonate()}
      />

      {/* Main Container */}
      <main>
        {/* Hero Section */}
        <header className="bmm-hero">
          {/* Real-time WebSocket Metrics Row */}
          <RealtimeMetricsRow spots={spots} />

          <h1 className="bmm-h1">
            Your brand, on my Mac.
          </h1>
          <p className="bmm-hero-sub">
            Your logo travels with me on a founder’s best friend: the MacBook.
          </p>

          {/* Funding Progress Bar */}
          <div className="bmm-progress-wrap">
            <div className="bmm-progress-meta">
              <span className="bmm-progress-raised tabular-nums">
                {totalRaised}
                <span>raised</span>
              </span>
              <span className="bmm-progress-goal">
                hardware goal · <strong className="tabular-nums">{percentProgress}% funded</strong>
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={percentProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Funding progress"
              className="bmm-progress-bar"
            >
              <div
                className="bmm-progress-fill"
                style={{ width: `${Math.min(percentProgress, 100)}%` }}
              />
            </div>
          </div>

          {/* Interactive Centerpiece Stage */}
          <div id="macbook-showcase" style={{ width: '100%' }}>
            <MacbookDisplay
              currency={currency}
              spots={spots}
              onSpotClick={handleSpotClick}
            />
          </div>

          {/* Hero Pitch Text */}
          <div className="bmm-hero-quote">
            <p>
              We’re financing our Apple M5 Max / M5 Pro developer machine and early VESPER startup runway by turning its aluminum surfaces into an advertising canvas.
            </p>
            <p>
              Demo days, VC pitch rooms, AI summits, hackathons, and founder cafes… get your brand seen by top tech operators IRL and online. With no budget limit, every extra dollar fuels high-impact startup execution.
            </p>
          </div>

          {/* Hero Bottom CTAs */}
          <div className="bmm-hero-bottom-actions">
            <button
              type="button"
              onClick={() => handleOpenDonate()}
              className="bmm-btn-blue"
            >
              💖 Fund This Mac / Sponsor
            </button>
            <a href="#vesper-mission" className="bmm-link-how">
              Read the VESPER story ›
            </a>
            <a href="#events" className="bmm-link-how" style={{ marginLeft: '12px' }}>
              View upcoming events ›
            </a>
          </div>
        </header>

        {/* Black Contrast Section */}
        <section className="bmm-black-section">
          <div className="bmm-black-inner">
            <h2 className="bmm-black-h2">
              Everyone recognises the apple.{' '}
              <span>Show your logo right next to it across Silicon Valley & Bangalore.</span>
            </h2>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <a
                href="#vesper-mission"
                aria-label="Discover the story"
                className="bmm-arrow-down-btn"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" style={{ width: '32px', height: '32px' }}>
                  <path
                    d="M6 9.75L12 15.75L18 9.75"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* 1. VESPER Startup Story & Mission */}
        <VesperMission />

        {/* 2. IRL Startup Events Roadmap */}
        <EventsRoadmap />

        {/* 3. Official Sponsors Wall & Sponsorship Tiers */}
        <SponsorsWall
          currency={currency}
          onSelectTier={(tier) => handleOpenDonate(tier)}
          onOpenCustomDonation={() => handleOpenDonate()}
        />

        {/* 4. The Live Auction & Spots Grid */}
        <AuctionSection
          currency={currency}
          spots={spots}
          onSpotClick={handleSpotClick}
        />

        {/* 5. How It Works (3 Steps) */}
        <HowItWorks />

        {/* 6. Machine Specs */}
        <MachineSpecs />

        {/* 7. FAQ Accordion */}
        <FAQSection />
      </main>

      {/* Footer */}
      <BrandMyMacFooter />

      {/* Spot Inspection & Claim Modal */}
      <BidModal
        spot={selectedSpot}
        currency={currency}
        onClose={() => setSelectedSpot(null)}
      />

      {/* Donation & Sponsor Tier Checkout Modal */}
      <DonationModal
        isOpen={isDonationModalOpen}
        selectedTier={selectedTier}
        currency={currency}
        onClose={() => setIsDonationModalOpen(false)}
      />

      {/* Post-Checkout Verification & Confirmation Modal */}
      {checkoutReturn && (
        <CheckoutVerificationModal
          sessionId={checkoutReturn.sessionId}
          initialStatus={checkoutReturn.status}
          onClose={clearCheckoutUrlParams}
          onPaymentConfirmed={() => {
            refreshCanonicalData();
          }}
        />
      )}

      {/* Floating Live Activity Ticker Toast */}
      <LiveActivityTicker
        spots={spots}
        onSpotSelect={() => {
          const el = document.getElementById('sponsors');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  );
};

export default App;
