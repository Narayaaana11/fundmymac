import React from 'react';
import { FUNDING_GOAL, FUNDING_MILESTONES } from '../data/fundMyMacData';
import { SpotlightCard } from './SpotlightCard';

export const MachineSpecs: React.FC = () => {
  return (
    <section id="specs" className="bmm-specs-section">
      <div className="bmm-specs-inner">
        {/* Header Badge */}
        <div className="bmm-pill-badge-indigo" style={{ display: 'inline-flex', marginBottom: '12px' }}>
          <span>HARDWARE SPECIFICATIONS & STARTUP EXPANSION</span>
        </div>
        <h2 className="bmm-auction-h2">The Machine We Are Funding · Apple M5 Max / M5 Pro</h2>
        <p className="bmm-specs-desc">
          Engineering and deploying <strong>VESPER</strong> requires zero-latency local LLM evaluation, 100+ concurrent background agent workflows, Docker container virtualization, and high-throughput compilation without thermal throttling.
        </p>

        {/* 3 Core Hardware Cards */}
        <div
          className="bmm-specs-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            margin: '24px 0'
          }}
        >
          <SpotlightCard className="bmm-spec-card" spotlightColor="rgba(0, 113, 227, 0.12)">
            <span className="spec-title">Target Device</span>
            <strong className="spec-value">{FUNDING_GOAL.deviceTarget}</strong>
            <p className="spec-detail">
              16″ Liquid Retina XDR display (120Hz ProMotion, 1600 nits peak), next-generation CPU/GPU architecture, 16-core Apple Neural Engine, and 400GB/s+ unified memory bandwidth.
            </p>
          </SpotlightCard>

          <SpotlightCard className="bmm-spec-card" spotlightColor="rgba(52, 199, 89, 0.12)">
            <span className="spec-title">Hardware Purpose</span>
            <strong className="spec-value">Autonomous Agent Engineering</strong>
            <p className="spec-detail">{FUNDING_GOAL.devicePurpose}</p>
          </SpotlightCard>

          <SpotlightCard className="bmm-spec-card" spotlightColor="rgba(239, 68, 68, 0.12)">
            <span className="spec-title">Previous Device (Fried)</span>
            <strong className="spec-value" style={{ color: '#ef4444' }}>ASUS TUF Gaming F15</strong>
            <p className="spec-detail">{FUNDING_GOAL.previousDevice}</p>
          </SpotlightCard>
        </div>

        {/* Open-Ended / No Limit Startup Investment Policy Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.06), rgba(147, 51, 234, 0.06))',
            border: '1px solid rgba(0, 113, 227, 0.22)',
            borderRadius: '16px',
            padding: '24px',
            margin: '28px 0 20px',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🚀</span>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--ink-1)', margin: 0 }}>
              No Budget Limit · 100% of Surplus Funds Invested Into VESPER
            </h3>
          </div>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink-2)', margin: '0 0 16px' }}>
            There is <strong>no ceiling on our fundraising goal</strong>. The $3,999 target represents Phase 1: securing the flagship Apple M5 Max / M5 Pro machine so our founder can resume core engineering. Every extra dollar raised beyond hardware costs is channeled directly into scaling the <strong>VESPER</strong> AI startup:
          </p>

          {/* Milestones Roadmap */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '12px'
            }}
          >
            {FUNDING_MILESTONES.map((m) => (
              <div
                key={m.id}
                style={{
                  background: 'var(--surface)',
                  border: m.status === 'active' ? '1.5px solid #0071e3' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: m.status === 'active' ? 'rgba(0, 113, 227, 0.12)' : 'var(--badge-bg)',
                      color: m.status === 'active' ? '#0071e3' : 'var(--ink-2)'
                    }}
                  >
                    {m.badge}
                  </span>
                  <strong style={{ fontSize: '13px', color: 'var(--ink-1)' }}>
                    ${m.amountUsd.toLocaleString()}
                  </strong>
                </div>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink-1)', margin: '2px 0 0' }}>
                  {m.title}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--ink-2)', margin: 0, lineHeight: '1.45' }}>
                  {m.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
