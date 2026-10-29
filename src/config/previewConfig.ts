/**
 * =========================================================================
 * Fund My Mac: BrandMyMac 14-Day Live Auction Configuration
 * =========================================================================
 * 
 * Bidding is live in test/pre-production mode with 20% deposit upfront via Razorpay.
 * Outbid deposits are automatically refunded in full.
 */

export const IS_PUBLIC_PREVIEW = false;
export const IS_AUCTION_ACTIVE = true;
export const IS_TEST_MODE = true;

export const AUCTION_COPY = {
  campaignName: 'Fund My Mac',
  heroTagline: 'Your brand, on my Mac.',
  heroDescription:
    'Turn prime laptop aluminum into high-impact IRL and digital advertising across Silicon Valley, Bangalore, and global demo days.',
  auctionNotice: '14-Day Live Auction · 20% Deposit to Bid · 100% Outbid Refund Guarantee',
  ctaPrimary: 'Bid on a Spot',
  ctaSecondary: 'View Leaderboard',
  outbidGuarantee: 'If you are outbid, your 20% deposit is automatically refunded in full.'
} as const;

// Legacy compatibility export
export const PREVIEW_COPY = AUCTION_COPY;
