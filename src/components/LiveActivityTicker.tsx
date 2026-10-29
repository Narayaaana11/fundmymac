import React, { useState, useEffect } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ActivityItem {
  id: string;
  sponsor: string;
  amount: string;
  spot: string;
  status: string;
  isReal?: boolean;
}

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  { id: 'def-1', sponsor: 'Spot #2 (Marquee Title)', amount: '$500', spot: 'Above Apple Logo', status: 'Available to Sponsor' },
  { id: 'def-2', sponsor: 'Spot #1 (Top Left Banner)', amount: '$250', spot: 'Exterior Aluminum Lid', status: 'Available to Sponsor' },
  { id: 'def-3', sponsor: 'The Corner Banner', amount: '$75', spot: 'Sticky Top Left Widget', status: 'Available Now' },
  { id: 'def-4', sponsor: '140W GaN Fast Charger', amount: '$150', spot: 'Accessory Branding', status: 'Available to Sponsor' },
  { id: 'def-5', sponsor: 'Apple Magic Mouse', amount: '$99', spot: 'Curved Top Shell', status: 'Available to Sponsor' },
  { id: 'def-6', sponsor: 'IRL Startup Roadshow', amount: 'Tech Summits', spot: 'Bangalore & SF Demo Days', status: 'Confirmed' }
];

interface LiveActivityTickerProps {
  spots?: BrandSpot[];
  onSpotSelect?: (spotName: string) => void;
}

export const LiveActivityTicker: React.FC<LiveActivityTickerProps> = ({ spots, onSpotSelect }) => {
  const [activities, setActivities] = useState<ActivityItem[]>(DEFAULT_ACTIVITIES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Sync real sold spots from props / localStorage
  useEffect(() => {
    if (!spots) return;
    const soldSpots = spots.filter((s) => s.isSold);
    if (soldSpots.length > 0) {
      const timer = setTimeout(() => {
        const realItems: ActivityItem[] = soldSpots.map((s) => ({
          id: `sold-${s.id}`,
          sponsor: s.sponsorName || `Spot #${s.id}`,
          amount: `$${s.topBidUsd}`,
          spot: s.name,
          status: 'Secured! 🔥',
          isReal: true
        }));

        setActivities((prev) => {
          const withoutOldReal = prev.filter((item) => !item.id.startsWith('sold-'));
          return [...realItems, ...withoutOldReal];
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [spots]);

  // Connect to Supabase Realtime to pull live claims and donations
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    let isMounted = true;

    // 1. Initial fetch of claimed spots from Supabase
    client
      .from('brand_spots')
      .select('id, name, sponsor_name, top_bid_usd, is_sold')
      .eq('is_sold', true)
      .then(({ data, error }) => {
        if (!isMounted || error || !data || data.length === 0) return;
        const dbItems: ActivityItem[] = data.map((d: { id: number; name?: string; sponsor_name?: string; top_bid_usd?: number }) => ({
          id: `supabase-spot-${d.id}`,
          sponsor: d.sponsor_name || `Spot #${d.id}`,
          amount: `$${d.top_bid_usd || 100}`,
          spot: d.name || `Spot #${d.id}`,
          status: 'Secured! 🔥',
          isReal: true
        }));

        setActivities((prev) => {
          const filtered = prev.filter((p) => !p.id.startsWith('supabase-spot-'));
          return [...dbItems, ...filtered];
        });
      });

    // 2. Realtime listener for incoming claims and donations
    const channel = client
      .channel('ticker_realtime_claims')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_spots' }, (payload) => {
        if (!isMounted) return;
        const newRecord = payload.new as { id?: number; name?: string; sponsor_name?: string; top_bid_usd?: number; is_sold?: boolean };
        if (newRecord && newRecord.is_sold) {
          const freshItem: ActivityItem = {
            id: `live-claim-${newRecord.id}-${Date.now()}`,
            sponsor: newRecord.sponsor_name || `Spot #${newRecord.id}`,
            amount: `$${newRecord.top_bid_usd || 100}`,
            spot: newRecord.name || `Spot #${newRecord.id}`,
            status: 'Just Claimed! 🔥',
            isReal: true
          };

          setActivities((prev) => [freshItem, ...prev.filter((p) => p.id !== freshItem.id)]);
          setCurrentIndex(0); // Immediately highlight the newly claimed spot!
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations' }, (payload) => {
        if (!isMounted) return;
        const newDonation = payload.new as { amount_usd?: number; tier_name?: string };
        if (newDonation) {
          const freshItem: ActivityItem = {
            id: `live-donation-${Date.now()}`,
            sponsor: newDonation.tier_name || 'Supporter',
            amount: `$${newDonation.amount_usd || 50}`,
            spot: 'Founder Roadshow Pool',
            status: 'Just Backed! 💖',
            isReal: true
          };

          setActivities((prev) => [freshItem, ...prev]);
          setCurrentIndex(0);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      client.removeChannel(channel);
    };
  }, []);

  // Cycle through ticker activities
  useEffect(() => {
    if (isPaused || activities.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, activities.length]);

  if (!isVisible || activities.length === 0) return null;

  const current = activities[currentIndex % activities.length] || activities[0];
  if (!current) return null;

  return (
    <div
      className={`bmm-activity-ticker-card ${current.isReal ? 'is-real-event' : ''}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={() => onSpotSelect && onSpotSelect(current.spot)}
    >
      <div className="ticker-left-pill">
        <span className="ticker-pulse-dot" />
        <span className="ticker-badge-text">{current.isReal ? 'LIVE CLAIM' : 'FUND MY MAC'}</span>
      </div>

      <div className="ticker-content-text">
        <strong>{current.sponsor}</strong> ·{' '}
        <span className="ticker-amount">{current.amount}</span> ·{' '}
        <span className="ticker-spot">{current.spot}</span>{' '}
        <span className="ticker-time" style={{ color: current.isReal ? '#16a34a' : undefined, fontWeight: current.isReal ? 600 : undefined }}>
          ({current.status})
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(false);
        }}
        className="ticker-close-btn"
        aria-label="Dismiss toast"
      >
        ✕
      </button>
    </div>
  );
};
