import { useState, useEffect, useRef, useCallback } from 'react';
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

const getRealSpotsSold = () => BRAND_SPOTS.filter((s) => s.isSold).length;
const getRealTotalSpots = () => BRAND_SPOTS.length;

const INITIAL_METRICS: RealtimeMetricsData = {
  xViews: 13000000,
  visitors: 140548,
  spotsSold: getRealSpotsSold(),
  totalSpots: getRealTotalSpots(),
  isConnected: true,
  lastUpdate: Date.now()
};

const STORAGE_KEY = 'bmm_realtime_metrics_v2';
const CHANNEL_NAME = 'bmm_metrics_websocket_channel';

export function useRealtimeMetrics(customWsUrl?: string) {
  const [metrics, setMetrics] = useState<RealtimeMetricsData>(() => {
    const realSold = getRealSpotsSold();
    const realTotal = getRealTotalSpots();

    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...INITIAL_METRICS,
          ...parsed,
          spotsSold: realSold,
          totalSpots: realTotal,
          isConnected: true
        };
      }
    } catch {
      // Ignore storage errors
    }
    return {
      ...INITIAL_METRICS,
      spotsSold: realSold,
      totalSpots: realTotal
    };
  });

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
    setMetrics((prev) => {
      const next: RealtimeMetricsData = {
        ...prev,
        ...updates,
        lastUpdate: Date.now()
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          visitors: next.visitors,
          xViews: next.xViews,
          spotsSold: next.spotsSold,
          totalSpots: next.totalSpots
        }));
      } catch {
        // Ignore storage errors
      }
      return next;
    });

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

    // 2. Real Supabase Realtime WebSocket Connection (if configured)
    if (isSupabaseConfigured && supabase) {
      const client = supabase;

      // Record real pageview once per browser session
      const recordRealVisit = async () => {
        try {
          const isViewed = sessionStorage.getItem('bmm_real_visit_recorded');
          if (!isViewed) {
            sessionStorage.setItem('bmm_real_visit_recorded', '1');
            const { data } = await client.rpc('record_view');
            if (isMounted && typeof data === 'number') {
              updateMetrics({ visitors: data }, 'visitors');
            }
          } else {
            // Fetch current stats
            const { data } = await client.from('site_stats').select('views, x_views, spots_sold').maybeSingle();
            if (isMounted && data) {
              updateMetrics({
                visitors: data.views ?? metrics.visitors,
                xViews: data.x_views ?? metrics.xViews,
                spotsSold: data.spots_sold ?? metrics.spotsSold
              });
            }
          }
        } catch {
          // Fallback if rpc is not created yet
        }
      };

      recordRealVisit();

      // Subscribe to Supabase Realtime PostgreSQL changes over WebSocket
      const realtimeChannel = client
        .channel('realtime_site_stats')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_stats' },
          (payload) => {
            if (!isMounted) return;
            const newRecord = payload.new as { views?: number; x_views?: number; spots_sold?: number };
            if (newRecord) {
              const updates: Partial<RealtimeMetricsData> = {};
              if (typeof newRecord.views === 'number') updates.visitors = newRecord.views;
              if (typeof newRecord.x_views === 'number') updates.xViews = newRecord.x_views;
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

    // 3. Standalone WebSocket Connection (if VITE_WS_URL or customWsUrl is provided)
    const wsUrl = customWsUrl || (import.meta as unknown as { env?: { VITE_WS_URL?: string } }).env?.VITE_WS_URL;

    const connectWebSocket = () => {
      if (!wsUrl) return;

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

    if (wsUrl) {
      connectWebSocket();
    } else {
      // Real local unique session visit recording (no fake random loop)
      try {
        const sessionCounted = sessionStorage.getItem('bmm_session_visit_recorded');
        if (!sessionCounted) {
          sessionStorage.setItem('bmm_session_visit_recorded', '1');
          setTimeout(() => {
            if (!isMounted) return;
            setMetrics((prev) => {
              const nextVisitors = prev.visitors + 1;
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                  ...prev,
                  visitors: nextVisitors
                }));
              } catch {}
              return { ...prev, visitors: nextVisitors };
            });
          }, 0);
        }
      } catch {}
    }

    // Expose window helper for manual testing or external integration
    (window as unknown as { __fundMyMacWebSocket?: object }).__fundMyMacWebSocket = {
      send: (message: WebSocketMetricsMessage) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify(message));
        } else if (message.payload) {
          updateMetrics(message.payload, message.field);
          channel?.postMessage(message);
        }
      },
      updateMetrics: (payload: Partial<RealtimeMetricsData>) => {
        updateMetrics(payload);
        channel?.postMessage({
          type: 'METRICS_UPDATE',
          payload
        });
      }
    };

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
  }, [customWsUrl, updateMetrics, metrics.visitors, metrics.xViews, metrics.spotsSold]);

  return {
    metrics,
    highlightField,
    updateMetrics,
    triggerHighlight
  };
}
