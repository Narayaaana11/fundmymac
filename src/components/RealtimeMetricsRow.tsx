import React from 'react';
import type { BrandSpot } from '../data/fundMyMacData';
import { useRealtimeMetrics } from '../hooks/useRealtimeMetrics';

interface RealtimeMetricsRowProps {
  className?: string;
  spots?: BrandSpot[];
  customWsUrl?: string;
}

export const RealtimeMetricsRow: React.FC<RealtimeMetricsRowProps> = ({
  className,
  spots,
  customWsUrl
}) => {
  const { metrics, highlightField } = useRealtimeMetrics(spots, customWsUrl);

  const formattedViews = metrics.xViews >= 1000000
    ? `${(metrics.xViews / 1000000).toFixed(0)}M+`
    : metrics.xViews > 0
    ? metrics.xViews.toLocaleString('en-US')
    : null;

  return (
    <div className={`bmm-hero-metrics-row ${className || ''}`}>
      {/* Campaign Roadshow Reach Milestone */}
      <span
        className={`bmm-hero-metric-item ${highlightField === 'xViews' ? 'metric-glow' : ''}`}
        title={formattedViews ? `${metrics.xViews.toLocaleString('en-US')} campaign reach milestone on X` : 'IRL global startup roadshow'}
      >
        {formattedViews ? (
          <>
            <strong className="tabular-nums">{formattedViews}</strong> reach milestone
          </>
        ) : (
          <>
            <strong className="tabular-nums">IRL</strong> global roadshow
          </>
        )}
      </span>

      <span className="bmm-hero-metric-sep" aria-hidden="true">•</span>

      {/* Measured unique site visitors */}
      <span
        className={`bmm-hero-metric-item ${highlightField === 'visitors' ? 'metric-glow' : ''}`}
        title="Measured unique session visitors recorded via Supabase"
      >
        <strong className="tabular-nums">{metrics.visitors.toLocaleString('en-US')}</strong> site visitors
      </span>

      <span className="bmm-hero-metric-sep" aria-hidden="true">•</span>

      {/* Canonical spots sold from inventory */}
      <span
        className={`bmm-hero-metric-item ${highlightField === 'spotsSold' ? 'metric-glow' : ''}`}
        title={`${metrics.spotsSold} out of ${metrics.totalSpots} sponsor spots taken`}
      >
        <strong className="tabular-nums">{metrics.spotsSold}/{metrics.totalSpots}</strong> spots taken
      </span>
    </div>
  );
};
