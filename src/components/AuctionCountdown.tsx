import React, { useState, useEffect } from 'react';
import { AUCTION_CONFIG } from '../data/fundMyMacData';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(targetTime: string): TimeLeft {
  const target = new Date(targetTime).getTime();
  const now = Date.now();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
}

interface AuctionCountdownProps {
  compact?: boolean;
}

export const AuctionCountdown: React.FC<AuctionCountdownProps> = ({ compact = false }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeRemaining(AUCTION_CONFIG.auctionEndTime)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(AUCTION_CONFIG.auctionEndTime));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (timeLeft.isExpired) {
    return (
      <div className="bmm-countdown-pill expired">
        <span>🏁 Auction Ended</span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  if (compact) {
    return (
      <div className="bmm-countdown-compact" aria-label="Auction countdown">
        <span className="bmm-countdown-pulse" />
        <span className="bmm-countdown-compact-label">Ends in:</span>
        <span className="bmm-countdown-compact-nums tabular-nums">
          {timeLeft.days}d {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
        </span>
      </div>
    );
  }

  return (
    <div className="bmm-countdown-hero" aria-label="14-Day Auction Live Countdown">
      <div className="bmm-countdown-header">
        <span className="bmm-live-pulse-ring" />
        <span className="bmm-countdown-title">14-Day Live Auction Closes In</span>
      </div>

      <div className="bmm-countdown-grid">
        <div className="bmm-countdown-box">
          <span className="bmm-countdown-num tabular-nums">{timeLeft.days}</span>
          <span className="bmm-countdown-unit">Days</span>
        </div>
        <span className="bmm-countdown-sep">:</span>
        <div className="bmm-countdown-box">
          <span className="bmm-countdown-num tabular-nums">{pad(timeLeft.hours)}</span>
          <span className="bmm-countdown-unit">Hours</span>
        </div>
        <span className="bmm-countdown-sep">:</span>
        <div className="bmm-countdown-box">
          <span className="bmm-countdown-num tabular-nums">{pad(timeLeft.minutes)}</span>
          <span className="bmm-countdown-unit">Mins</span>
        </div>
        <span className="bmm-countdown-sep">:</span>
        <div className="bmm-countdown-box">
          <span className="bmm-countdown-num tabular-nums">{pad(timeLeft.seconds)}</span>
          <span className="bmm-countdown-unit">Secs</span>
        </div>
      </div>
    </div>
  );
};
