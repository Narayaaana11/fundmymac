import React from 'react';
import { useRealtimeMetrics } from '../hooks/useRealtimeMetrics';

interface RealtimeMetricsRowProps {
  className?: string;
  customWsUrl?: string;
}

export const RealtimeMetricsRow: React.FC<RealtimeMetricsRowProps> = ({
  className,
  customWsUrl
}) => {
  const { metrics, highlightField } = useRealtimeMetrics(customWsUrl);

  const formattedViews = metrics.xViews >= 1000000
    ? `${(metrics.xViews / 1000000).toFixed(0)}M+`
    : metrics.xViews.toLocaleString('en-US');

  return (
    <div className={`bmm-hero-metrics-row ${className || ''}`}>
      {/* Views on X */}
      <span
        className={`bmm-hero-metric-item ${highlightField === 'xViews' ? 'metric-glow' : ''}`}
        title={`${metrics.xViews.toLocaleString('en-US')} live impressions on X`}
      >
        <strong className="tabular-nums">{formattedViews}</strong> views on X
      </span>

      <span className="bmm-hero-metric-sep" aria-hidden="true">•</span>

      {/* 140,548 visitors with live ticking numbers */}
      <span
        className={`bmm-hero-metric-item ${highlightField === 'visitors' ? 'metric-glow' : ''}`}
        title="Live site visitors updated in real time via WebSocket"
      >
        <strong className="tabular-nums">{metrics.visitors.toLocaleString('en-US')}</strong> visitors
      </span>

      <span className="bmm-hero-metric-sep" aria-hidden="true">•</span>

      {/* 20/20 spots sold */}
      <span
        className={`bmm-hero-metric-item ${highlightField === 'spotsSold' ? 'metric-glow' : ''}`}
        title={`${metrics.spotsSold} out of ${metrics.totalSpots} sponsor spots taken`}
      >
        <strong className="tabular-nums">{metrics.spotsSold}/{metrics.totalSpots}</strong> spots sold
      </span>
    </div>
  );
};
