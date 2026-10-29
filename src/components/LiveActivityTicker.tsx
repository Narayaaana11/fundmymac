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

// Campaign milestone announcements (transparently informational, not simulated transactions)
const CAMPAIGN_ANNOUNCEMENTS: ActivityItem[] = [
  { id: 'ann-1', sponsor: 'VESPER Hardware Goal', amount: 'Target Goal', spot: 'MacBook Pro 16″ (M5 Max / Pro)', status: 'Public Preview', isReal: false },
  { id: 'ann-2', sponsor: 'IRL Founder Roadshow', amount: 'Global Tech Summits', spot: 'Demo Days & VC Meetings', status: 'Scheduled', isReal: false },
  { id: 'ann-3', sponsor: 'Sticker Spot Sponsorships', amount: '20 Total Spaces', spot: 'Lid, Palm Rests, Charger & Mouse', status: 'Opening Soon', isReal: false }
];

interface LiveActivityTickerProps {
  spots?: BrandSpot[];
  onSpotSelect?: (spotName: string) => void;
}

export const LiveActivityTicker: React.FC<LiveActivityTickerProps> = ({ spots, onSpotSelect }) => {
  const [dbActivities, setDbActivities] = useState<ActivityItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Derive verified sold spots from canonical spots prop
  const soldItems: ActivityItem[] = (spots || [])
    .filter((s) => s.isSold)
    .map((s) => ({
      id: `sold-${s.id}`,
      sponsor: s.sponsorName || `Spot #${s.id}`,
      amount: 'Pricing Coming Soon',
      spot: s.name,
      status: 'Verified Sponsor! 🌟',
      isReal: true
    }));

  // Deduplicate combined activities
  const combinedActivities: ActivityItem[] = [
    ...soldItems,
    ...dbActivities.filter((dbItem) => !soldItems.some((s) => s.id === dbItem.id)),
    ...(soldItems.length === 0 && dbActivities.length === 0 ? CAMPAIGN_ANNOUNCEMENTS : [])
  ];

  // Connect to Supabase to pull live verified claims from public_sponsors_wall
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    let isMounted = true;

    // 1. Initial fetch from sanitized public_sponsors_wall
    client
      .from('public_sponsors_wall')
      .select('order_id, sponsor_name, amount_cents, currency, spot_id, order_type')
      .limit(10)
      .then(({ data, error }) => {
        if (!isMounted || error || !data || data.length === 0) return;
        const verifiedItems: ActivityItem[] = data.map((d) => ({
          id: `supabase-${d.order_id}`,
          sponsor: d.sponsor_name,
          amount: `${(d.amount_cents / 100).toLocaleString()} ${d.currency?.toUpperCase()}`,
          spot: d.spot_id ? `Spot #${d.spot_id}` : 'VESPER Backer Pool',
          status: 'Confirmed Backer! 🌟',
          isReal: true
        }));

        setDbActivities(verifiedItems);
      });

    // 2. Realtime listener for verified brand_spots changes
    const channel = client
      .channel('ticker_verified_claims')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_spots' }, (payload) => {
        if (!isMounted) return;
        const newRecord = payload.new as { id?: number; name?: string; sponsor_name?: string; price_usd_cents?: number; is_sold?: boolean; status?: string };
        if (newRecord && (newRecord.is_sold || newRecord.status === 'sold')) {
          const freshItem: ActivityItem = {
            id: `live-claim-${newRecord.id}-${Date.now()}`,
            sponsor: newRecord.sponsor_name || `Spot #${newRecord.id}`,
            amount: 'Pricing Coming Soon',
            spot: newRecord.name || `Spot #${newRecord.id}`,
            status: 'Verified Sponsor! 🌟',
            isReal: true
          };

          setDbActivities((prev) => [freshItem, ...prev]);
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
    if (isPaused || combinedActivities.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % combinedActivities.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, combinedActivities.length]);

  if (!isVisible || combinedActivities.length === 0) return null;

  const current = combinedActivities[currentIndex % combinedActivities.length] || combinedActivities[0];
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
        <span className="ticker-badge-text">{current.isReal ? 'VERIFIED BACKER' : 'CAMPAIGN UPDATE'}</span>
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
