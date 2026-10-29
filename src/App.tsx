import React, { useState, useEffect } from 'react';
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
import { LiveActivityTicker } from './components/LiveActivityTicker';
import { RealtimeMetricsRow } from './components/RealtimeMetricsRow';

export const App: React.FC = () => {
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('USD');
  const [selectedSpot, setSelectedSpot] = useState<BrandSpot | null>(null);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SponsorTier | null>(null);

  // Dynamic reactive spots state with localStorage persistence
  const [spots, setSpots] = useState<BrandSpot[]>(() => {
    try {
      const saved = localStorage.getItem('bmm_spots_state');
      return saved ? JSON.parse(saved) : BRAND_SPOTS;
    } catch {
      return BRAND_SPOTS;
    }
  });

  // Dynamic reactive funding progress with persistence
  const [raisedUsd, setRaisedUsd] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bmm_raised_usd');
      return saved ? Number(saved) : FUNDING_GOAL.raisedUsd;
    } catch {
      return FUNDING_GOAL.raisedUsd;
    }
  });

  const [raisedEur, setRaisedEur] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bmm_raised_eur');
      return saved ? Number(saved) : FUNDING_GOAL.raisedEur;
    } catch {
      return FUNDING_GOAL.raisedEur;
    }
  });

  // Supabase Realtime synchronization for spots & donations (multi-user live updates)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    let isMounted = true;

    // 1. Fetch claimed spots from Supabase
    client
      .from('brand_spots')
      .select('*')
      .then(({ data, error }) => {
        if (!isMounted || error || !data || data.length === 0) return;
        setSpots((prev) =>
          prev.map((s) => {
            const dbSpot = data.find((d: { id: number }) => d.id === s.id);
            if (!dbSpot) return s;
            return {
              ...s,
              isSold: Boolean(dbSpot.is_sold),
              sponsorName: dbSpot.sponsor_name || s.sponsorName,
              sponsorUrl: dbSpot.sponsor_url || s.sponsorUrl,
              logoUrl: dbSpot.logo_url || s.logoUrl,
              topBidUsd: dbSpot.top_bid_usd || s.topBidUsd,
              topBidEur: dbSpot.top_bid_eur || s.topBidEur,
              bidCount: dbSpot.bid_count || s.bidCount
            };
          })
        );
      });

    // 2. Fetch donations total
    client
      .from('donations')
      .select('amount_usd, amount_eur')
      .then(({ data, error }) => {
        if (!isMounted || error || !data || data.length === 0) return;
        const extraUsd = data.reduce((acc, d: { amount_usd?: number | string }) => acc + Number(d.amount_usd || 0), 0);
        const extraEur = data.reduce((acc, d: { amount_eur?: number | string }) => acc + Number(d.amount_eur || 0), 0);
        if (extraUsd > 0) {
          setRaisedUsd(FUNDING_GOAL.raisedUsd + extraUsd);
          setRaisedEur(FUNDING_GOAL.raisedEur + extraEur);
        }
      });

    // 3. Realtime updates across devices
    const syncChannel = client
      .channel('bmm_realtime_app_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_spots' }, (payload) => {
        if (!isMounted) return;
        const newRecord = payload.new as {
          id?: number;
          is_sold?: boolean;
          sponsor_name?: string;
          sponsor_url?: string;
          logo_url?: string;
          top_bid_usd?: number;
          top_bid_eur?: number;
          bid_count?: number;
        };
        if (newRecord && typeof newRecord.id === 'number') {
          setSpots((prev) =>
            prev.map((s) =>
              s.id === newRecord.id
                ? {
                    ...s,
                    isSold: Boolean(newRecord.is_sold),
                    sponsorName: newRecord.sponsor_name || s.sponsorName,
                    sponsorUrl: newRecord.sponsor_url || s.sponsorUrl,
                    logoUrl: newRecord.logo_url || s.logoUrl,
                    topBidUsd: newRecord.top_bid_usd || s.topBidUsd,
                    topBidEur: newRecord.top_bid_eur || s.topBidEur,
                    bidCount: newRecord.bid_count || s.bidCount
                  }
                : s
            )
          );
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations' }, (payload) => {
        if (!isMounted) return;
        const newDonation = payload.new as { amount_usd?: number | string; amount_eur?: number | string };
        if (newDonation) {
          const addUsd = Number(newDonation.amount_usd || 0);
          const addEur = Number(newDonation.amount_eur || 0);
          if (addUsd > 0) setRaisedUsd((prev) => prev + addUsd);
          if (addEur > 0) setRaisedEur((prev) => prev + addEur);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      client.removeChannel(syncChannel);
    };
  }, []);

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

  // Real bid confirmation handler: updates spot on 3D canvas and increments funding progress
  const handleConfirmBid = (
    spotId: number,
    brandName: string,
    websiteUrl: string,
    logoUrl?: string,
    amountUsd?: number,
    amountEur?: number
  ) => {
    const addUsd = amountUsd || 100;
    const addEur = amountEur || 90;

    setSpots((prev) => {
      const next = prev.map((s) =>
        s.id === spotId
          ? {
              ...s,
              isSold: true,
              sponsorName: brandName,
              sponsorUrl: websiteUrl,
              logoUrl: logoUrl || s.logoUrl,
              topBidUsd: s.topBidUsd + addUsd,
              topBidEur: s.topBidEur + addEur,
              bidCount: s.bidCount + 1
            }
          : s
      );
      try {
        localStorage.setItem('bmm_spots_state', JSON.stringify(next));
      } catch {}
      return next;
    });

    setRaisedUsd((prev) => {
      const next = prev + addUsd;
      try {
        localStorage.setItem('bmm_raised_usd', String(next));
      } catch {}
      return next;
    });

    setRaisedEur((prev) => {
      const next = prev + addEur;
      try {
        localStorage.setItem('bmm_raised_eur', String(next));
      } catch {}
      return next;
    });

    // Remote sync with Supabase if configured
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      const current = spots.find((s) => s.id === spotId);
      client
        .from('brand_spots')
        .update({
          is_sold: true,
          sponsor_name: brandName,
          sponsor_url: websiteUrl,
          logo_url: logoUrl || null,
          top_bid_usd: (current?.topBidUsd || 100) + addUsd,
          top_bid_eur: (current?.topBidEur || 90) + addEur,
          bid_count: (current?.bidCount || 0) + 1,
          claimed_at: new Date().toISOString()
        })
        .eq('id', spotId)
        .then();

      // Update spots_sold count in site_stats
      client
        .from('site_stats')
        .select('spots_sold')
        .eq('id', 1)
        .maybeSingle()
        .then(({ data }) => {
          if (data && typeof data.spots_sold === 'number') {
            client
              .from('site_stats')
              .update({ spots_sold: data.spots_sold + 1 })
              .eq('id', 1)
              .then();
          }
        });
    }
  };

  // Real donation confirmation handler: updates funding progress
  const handleConfirmDonation = (amountUsd: number, amountEur: number) => {
    setRaisedUsd((prev) => {
      const next = prev + amountUsd;
      try {
        localStorage.setItem('bmm_raised_usd', String(next));
      } catch {}
      return next;
    });

    setRaisedEur((prev) => {
      const next = prev + amountEur;
      try {
        localStorage.setItem('bmm_raised_eur', String(next));
      } catch {}
      return next;
    });

    // Remote sync with Supabase if configured
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      client
        .from('donations')
        .insert({
          amount_usd: amountUsd,
          amount_eur: amountEur,
          tier_name: selectedTier?.name || 'Custom Backer'
        })
        .then();
    }
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
          <RealtimeMetricsRow />

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
        onConfirmBid={handleConfirmBid}
      />

      {/* Donation & Sponsor Tier Checkout Modal */}
      <DonationModal
        isOpen={isDonationModalOpen}
        selectedTier={selectedTier}
        currency={currency}
        onClose={() => setIsDonationModalOpen(false)}
        onConfirmDonation={handleConfirmDonation}
      />

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
