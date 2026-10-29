import { useState, useEffect, useRef, useCallback } from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import { BRAND_SPOTS } from '../data/fundMyMacData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface RealtimeMetricsData {
  xViews: number;
  visitors: number;
  spotsSold: number;
  totalSpots: number;
  isConnected: boolean;
  lastUpdate: number;
}

export interface WebSocketMetricsMessage {
  type: 'METRICS_UPDATE' | 'VISITOR_INCREMENT' | 'SPOT_SOLD' | 'PING' | 'PONG';
  payload?: Partial<RealtimeMetricsData>;
  field?: 'xViews' | 'visitors' | 'spotsSold';
  timestamp?: number;
}

const getRealSpotsSold = (spots?: BrandSpot[]) =>
  (spots || BRAND_SPOTS).filter((s) => s.isSold).length;

const getRealTotalSpots = (spots?: BrandSpot[]) =>
  (spots || BRAND_SPOTS).length;

const INITIAL_METRICS: RealtimeMetricsData = {
  xViews: Number(import.meta.env.VITE_X_VIEWS) || 0,
  visitors: 0,
  spotsSold: getRealSpotsSold(),
  totalSpots: getRealTotalSpots(),
  isConnected: true,
  lastUpdate: Date.now()
};

const CHANNEL_NAME = 'bmm_metrics_broadcast_channel';

export function useRealtimeMetrics(spots?: BrandSpot[], customWsUrl?: string) {
  const [metrics, setMetrics] = useState<RealtimeMetricsData>(() => ({
    ...INITIAL_METRICS,
    spotsSold: getRealSpotsSold(spots),
    totalSpots: getRealTotalSpots(spots)
  }));

  const [highlightField, setHighlightField] = useState<'xViews' | 'visitors' | 'spotsSold' | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const triggerHighlight = useCallback((field: 'xViews' | 'visitors' | 'spotsSold') => {
    setHighlightField(field);
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightField(null);
    }, 1200);
  }, []);

  const updateMetrics = useCallback((updates: Partial<RealtimeMetricsData>, fieldToHighlight?: 'xViews' | 'visitors' | 'spotsSold') => {
    setMetrics((prev) => ({
      ...prev,
      ...updates,
      lastUpdate: Date.now()
    }));

    if (fieldToHighlight) {
      triggerHighlight(fieldToHighlight);
    }
  }, [triggerHighlight]);

  useEffect(() => {
    let isMounted = true;

    // 1. Cross-tab real-time sync with BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<WebSocketMetricsMessage>) => {
        if (event.data && event.data.type === 'METRICS_UPDATE' && event.data.payload) {
          updateMetrics(event.data.payload, event.data.field);
        }
      };
    } catch {
      // BroadcastChannel unsupported fallback
    }

    // 2. Real Supabase Realtime Connection (if configured)
    if (isSupabaseConfigured && supabase) {
      const client = supabase;

      // Record real pageview once per unique browser session
      const recordRealVisit = async () => {
        try {
          const sessionRecorded = sessionStorage.getItem('fundmymac_session_visit');
          if (!sessionRecorded) {
            sessionStorage.setItem('fundmymac_session_visit', '1');
            const { data } = await client.rpc('record_real_pageview');
            if (isMounted && typeof data === 'number') {
              updateMetrics({ visitors: data }, 'visitors');
            }
          } else {
            // Fetch current stats
            const { data } = await client.from('site_stats').select('views, spots_sold').maybeSingle();
            if (isMounted && data) {
              updateMetrics({
                visitors: typeof data.views === 'number' ? data.views : 0,
                spotsSold: typeof data.spots_sold === 'number' ? data.spots_sold : getRealSpotsSold(spots)
              });
            }
          }
        } catch {
          // RPC fallback
        }
      };

      recordRealVisit();

      // Subscribe to Supabase Realtime changes on site_stats
      const realtimeChannel = client
        .channel('realtime_site_stats')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_stats' },
          (payload) => {
            if (!isMounted) return;
            const newRecord = payload.new as { views?: number; spots_sold?: number };
            if (newRecord) {
              const updates: Partial<RealtimeMetricsData> = {};
              if (typeof newRecord.views === 'number') updates.visitors = newRecord.views;
              if (typeof newRecord.spots_sold === 'number') updates.spotsSold = newRecord.spots_sold;
              updateMetrics(updates, 'visitors');
            }
          }
        )
        .subscribe((status) => {
          if (isMounted) {
            setMetrics((prev) => ({ ...prev, isConnected: status === 'SUBSCRIBED' }));
          }
        });

      return () => {
        isMounted = false;
        client.removeChannel(realtimeChannel);
        channel?.close();
      };
    }

    // 3. Standalone WebSocket Connection (if customWsUrl is provided)
    const wsUrl = customWsUrl;
    if (wsUrl) {
      const connectWebSocket = () => {
        try {
          const ws = new WebSocket(wsUrl);
          socketRef.current = ws;

          ws.onopen = () => {
            if (!isMounted) return;
            setMetrics((prev) => ({ ...prev, isConnected: true }));
            ws.send(JSON.stringify({ type: 'SUBSCRIBE', channel: 'metrics' }));
          };

          ws.onmessage = (event) => {
            if (!isMounted) return;
            try {
              const data: WebSocketMetricsMessage = JSON.parse(event.data);
              if (data.type === 'METRICS_UPDATE' && data.payload) {
                updateMetrics(data.payload, data.field);
              }
            } catch {
              // Ignore non-json frames
            }
          };

          ws.onclose = () => {
            if (!isMounted) return;
            setMetrics((prev) => ({ ...prev, isConnected: false }));
            reconnectTimeoutRef.current = window.setTimeout(() => {
              connectWebSocket();
            }, 4000);
          };

          ws.onerror = () => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          };
        } catch {
          // Fallback
        }
      };

      connectWebSocket();
    }

    return () => {
      isMounted = false;
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      channel?.close();
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, [customWsUrl, updateMetrics, spots]);

  const effectiveMetrics: RealtimeMetricsData = {
    ...metrics,
    spotsSold: spots ? getRealSpotsSold(spots) : metrics.spotsSold,
    totalSpots: spots ? getRealTotalSpots(spots) : metrics.totalSpots
  };

  return {
    metrics: effectiveMetrics,
    highlightField,
    updateMetrics,
    triggerHighlight
  };
}
