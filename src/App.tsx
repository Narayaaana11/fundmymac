import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import type { BrandSpot, SponsorTier, CornerState } from './data/fundMyMacData';
import { FUNDING_GOAL, BRAND_SPOTS, CORNER_DATA } from './data/fundMyMacData';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { BrandMyMacNavbar, type DisplayCurrency } from './components/BrandMyMacNavbar';
import { CornerWidget } from './components/CornerWidget';
import { CornerTakeoverModal } from './components/CornerTakeoverModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AuctionCountdown } from './components/AuctionCountdown';
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
  const [currency, setCurrency] = useState<DisplayCurrency>('USD');
  const [selectedSpot, setSelectedSpot] = useState<BrandSpot | null>(null);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isCornerModalOpen, setIsCornerModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SponsorTier | null>(null);
  const [isLiveSync, setIsLiveSync] = useState(false);

  // Dynamic Corner Takeover state
  const [cornerData, setCornerData] = useState<CornerState>(CORNER_DATA);

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
  const [raisedInr, setRaisedInr] = useState<number>(FUNDING_GOAL.raisedInr || 0);

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
        if (error || !data || data.length === 0) {
          setIsLiveSync(false);
          return;
        }
        setIsLiveSync(true);
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
              topBidEur: dbSpot.price_eur_cents ? Math.round(dbSpot.price_eur_cents / 100) : (dbSpot.top_bid_eur || s.topBidEur),
              topBidInr: dbSpot.price_inr_paise ? Math.round(dbSpot.price_inr_paise / 100) : (dbSpot.top_bid_inr || s.topBidInr),
              bidCount: dbSpot.bid_count || s.bidCount
            };
          })
        );
      });

    // 2. Fetch canonical financial totals strictly from site_stats
    client
      .from('site_stats')
      .select('total_raised_usd_cents, total_raised_eur_cents, total_raised_inr_paise')
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
        if (typeof data.total_raised_inr_paise === 'number') {
          setRaisedInr(Math.round(data.total_raised_inr_paise / 100));
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
          price_inr_paise?: number;
          bid_count?: number;
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
                    topBidEur: newRecord.price_eur_cents ? Math.round(newRecord.price_eur_cents / 100) : s.topBidEur,
                    topBidInr: newRecord.price_inr_paise ? Math.round(newRecord.price_inr_paise / 100) : s.topBidInr,
                    bidCount: typeof newRecord.bid_count === 'number' ? newRecord.bid_count : s.bidCount + 1
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
          total_raised_inr_paise?: number;
        };
        if (newStats) {
          if (typeof newStats.total_raised_usd_cents === 'number') {
            setRaisedUsd(Math.round(newStats.total_raised_usd_cents / 100));
          }
          if (typeof newStats.total_raised_eur_cents === 'number') {
            setRaisedEur(Math.round(newStats.total_raised_eur_cents / 100));
          }
          if (typeof newStats.total_raised_inr_paise === 'number') {
            setRaisedInr(Math.round(newStats.total_raised_inr_paise / 100));
          }
        }
      })
      .subscribe((status) => {
        if (!isMounted) return;
        setIsLiveSync(status === 'SUBSCRIBED');
      });

    return () => {
      isMounted = false;
      client.removeChannel(syncChannel);
    };
  }, [refreshCanonicalData]);

  // Handle successful 20% deposit bid placement
  const handleBidPlaced = (
    spotId: number,
    bidData: {
      brandName: string;
      websiteUrl: string;
      email: string;
      logoUrl?: string;
      bidAmount: number;
      depositAmount: number;
      currency: DisplayCurrency;
    }
  ) => {
    setSpots((prev) =>
      prev.map((s) => {
        if (s.id !== spotId) return s;
        const newUsd =
          bidData.currency === 'USD'
            ? bidData.bidAmount
            : bidData.currency === 'EUR'
            ? Math.round(bidData.bidAmount * 1.08)
            : Math.round(bidData.bidAmount / 84);
        const newEur =
          bidData.currency === 'EUR'
            ? bidData.bidAmount
            : bidData.currency === 'USD'
            ? Math.round(bidData.bidAmount * 0.92)
            : Math.round(bidData.bidAmount / 91);
        const newInr =
          bidData.currency === 'INR'
            ? bidData.bidAmount
            : Math.round(newUsd * 84);

        return {
          ...s,
          sponsorName: bidData.brandName,
          sponsorUrl: bidData.websiteUrl,
          logoUrl: bidData.logoUrl || s.logoUrl,
          topBidUsd: newUsd,
          topBidEur: newEur,
          topBidInr: newInr,
          bidCount: s.bidCount + 1
        };
      })
    );

    const depositUsd =
      bidData.currency === 'USD'
        ? bidData.depositAmount
        : bidData.currency === 'EUR'
        ? Math.round(bidData.depositAmount * 1.08)
        : Math.round(bidData.depositAmount / 84);
    const depositEur =
      bidData.currency === 'EUR'
        ? bidData.depositAmount
        : bidData.currency === 'USD'
        ? Math.round(bidData.depositAmount * 0.92)
        : Math.round(bidData.depositAmount / 91);
    const depositInr =
      bidData.currency === 'INR'
        ? bidData.depositAmount
        : Math.round(depositUsd * 84);

    setRaisedUsd((prev) => prev + depositUsd);
    setRaisedEur((prev) => prev + depositEur);
    setRaisedInr((prev) => prev + depositInr);
  };

  // Handle successful dynamic corner takeover
  const handleCornerTakeoverSuccess = (newSponsor: {
    brandName: string;
    websiteUrl: string;
    avatarUrl: string;
    amountUsd: number;
    amountInr: number;
    amountEur: number;
  }) => {
    setCornerData((prev) => ({
      currentSponsor: newSponsor.brandName,
      currentUrl: newSponsor.websiteUrl,
      avatarUrl: newSponsor.avatarUrl,
      amountUsd: newSponsor.amountUsd,
      amountEur: newSponsor.amountEur,
      amountInr: newSponsor.amountInr,
      nextBidUsd: newSponsor.amountUsd + 10,
      nextBidEur: newSponsor.amountEur + 10,
      nextBidInr: newSponsor.amountInr + 800,
      heldDuration: 'Just now',
      history: [
        {
          name: prev.currentSponsor,
          url: prev.currentUrl,
          avatarUrl: prev.avatarUrl,
          amountUsd: prev.amountUsd,
          amountEur: prev.amountEur,
          amountInr: prev.amountInr,
          held: `${prev.heldDuration} · $${prev.amountUsd}`
        },
        ...prev.history
      ]
    }));

    setRaisedUsd((prev) => prev + newSponsor.amountUsd);
    setRaisedEur((prev) => prev + newSponsor.amountEur);
    setRaisedInr((prev) => prev + newSponsor.amountInr);
  };

  const totalRaised =
    currency === 'INR'
      ? `₹${raisedInr.toLocaleString('en-IN')}`
      : currency === 'EUR'
      ? `${raisedEur.toLocaleString()} €`
      : `$${raisedUsd.toLocaleString()}`;

  const goalTarget =
    currency === 'INR'
      ? `₹${FUNDING_GOAL.targetInr.toLocaleString('en-IN')}`
      : currency === 'EUR'
      ? `${FUNDING_GOAL.targetEur.toLocaleString()} €`
      : `$${FUNDING_GOAL.targetUsd.toLocaleString()}`;

  const percentProgress = Math.min(
    Math.round(
      currency === 'INR'
        ? (raisedInr / FUNDING_GOAL.targetInr) * 100
        : (raisedUsd / FUNDING_GOAL.targetUsd) * 100
    ),
    100
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
        onGetSpotClick={() => {
          const marqueeSpot = spots.find((s) => s.id === 2) || spots[0];
          setSelectedSpot(marqueeSpot);
        }}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
      />

      {/* Floating 'The Corner' Widget */}
      <CornerWidget
        currency={currency}
        cornerData={cornerData}
        onClaimCorner={() => setIsCornerModalOpen(true)}
      />

      {/* Main Container */}
      <main>
        {/* Hero Section */}
        <header className="bmm-hero">
          {/* Live Auction Notification Banner */}
          <div
            className="bmm-pill-badge-green"
            style={{
              marginBottom: '16px',
              background: 'rgba(52, 199, 89, 0.12)',
              color: '#27ae60',
              border: '1px solid rgba(52, 199, 89, 0.3)'
            }}
          >
            <span>🔥 14-DAY LIVE AUCTION · 20% DEPOSIT TO BID · 100% OUTBID REFUND</span>
          </div>

          {/* Real-time WebSocket Metrics Row */}
          <RealtimeMetricsRow spots={spots} />

          <h1 className="bmm-h1">
            Your brand, on my Mac.
          </h1>
          <p className="bmm-hero-sub" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)' }}>
            Turn laptop aluminum into high-impact IRL and digital advertising.
          </p>
          <p className="bmm-hero-sub" style={{ maxWidth: '640px', margin: '0 auto 20px', fontSize: '16px', lineHeight: 1.6 }}>
            Financing our Apple M5 Max / M5 Pro machine and VESPER AI startup by selling its surfaces. Bid for a spot and your logo travels to demo days, VC pitch rooms, hackathons, and every build-in-public vlog.
          </p>

          {/* 14-Day Live Countdown Component */}
          <div style={{ maxWidth: '480px', margin: '0 auto 24px' }}>
            <AuctionCountdown />
          </div>

          {/* Real-Time Hardware Funding Tracker */}
          <div className="bmm-progress-wrap">
            <div className="bmm-progress-meta">
              <span className="bmm-progress-raised tabular-nums">
                {totalRaised}
                <span>raised</span>
              </span>
              <span className="bmm-progress-goal">
                Milestone 1 Hardware Goal: <strong className="tabular-nums">{goalTarget}</strong> ({percentProgress}%)
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
                style={{ width: `${Math.max(percentProgress, 4)}%` }}
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
              onClick={() => {
                const marqueeSpot = spots.find((s) => s.id === 2) || spots[0];
                setSelectedSpot(marqueeSpot);
              }}
              className="bmm-btn-blue"
              style={{ padding: '12px 28px', fontSize: '15px' }}
            >
              🏷️ Bid on a Spot (From {currency === 'INR' ? '₹11,300' : '$135'})
            </button>
            <button
              type="button"
              onClick={() => setIsLeaderboardOpen(true)}
              className="bmm-btn-outline"
              style={{ padding: '12px 22px', fontSize: '14px', borderRadius: '980px', display: 'inline-flex', alignItems: 'center' }}
            >
              🏆 View Leaderboard
            </button>
            <button
              type="button"
              onClick={() => setIsCornerModalOpen(true)}
              className="bmm-btn-outline"
              style={{ padding: '12px 22px', fontSize: '14px', borderRadius: '980px', display: 'inline-flex', alignItems: 'center' }}
            >
              ⚡ Take The Corner
            </button>
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
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          isLiveSync={isLiveSync}
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

      {/* Spot Inspection & Live 20% Deposit Bidding Modal */}
      {selectedSpot && (
        <BidModal
          spot={selectedSpot}
          currency={currency}
          onClose={() => setSelectedSpot(null)}
          onBidPlaced={handleBidPlaced}
        />
      )}

      {/* Dynamic Corner Takeover Checkout Modal */}
      <CornerTakeoverModal
        isOpen={isCornerModalOpen}
        currency={currency}
        cornerData={cornerData}
        onClose={() => setIsCornerModalOpen(false)}
        onTakeoverSuccess={handleCornerTakeoverSuccess}
      />

      {/* Official Live Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        currency={currency}
        spots={spots}
        onClose={() => setIsLeaderboardOpen(false)}
        onSelectSpot={handleSpotClick}
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
