/**
 * =========================================================================
 * Fund My Mac: Public Preview Configuration & Safety Gates
 * =========================================================================
 * 
 * In Public Preview Mode:
 * - Razorpay live checkout is strictly disabled pending merchant approval.
 * - All pricing displays "Pricing Coming Soon" or safe preview notices.
 * - CTAs direct visitors to the priority waitlist and enquiry form.
 * - Zero simulated purchases, fake payment confirmations, or inventory mutations.
 */

export const IS_PUBLIC_PREVIEW = false;
export const IS_AUCTION_ACTIVE = true;
export const IS_TEST_MODE = true;

export const PREVIEW_COPY = {
  campaignName: 'Fund My Mac',
  heroTagline: 'Your brand, on my Mac.',
  heroDescription:
    'Turn prime laptop aluminum into high-impact IRL and digital advertising across Silicon Valley, Bangalore, and global demo days.',
  heroNotice: 'Sponsorships Opening Soon · Public Preview Active',
  previewBadge: '✨ PUBLIC PREVIEW · SPONSORSHIPS OPENING SOON',
  pricingBadge: 'Pricing Coming Soon',
  ctaPrimary: 'Join the Waitlist',
  ctaSecondary: 'View Hardware Specs',
  statusTag: 'Public Preview',
  waitlistNotice:
    'Sponsorship checkout is currently in public preview pending Razorpay merchant account approval. Register to receive early notification and launch access.',
  macbookHint:
    'Hover or click any spot to inspect dimensions and placement. Official pricing will open upon launch.',
  cornerHint:
    'The Corner spot takeover will open upon official launch. Join the priority waitlist today.',
  depositNotice:
    'Bidding and commitment deposits will be activated once payment gateway approval is finalized.'
} as const;

// Backwards compatibility alias
export const AUCTION_COPY = {
  ...PREVIEW_COPY,
  auctionNotice: 'Sponsorships Opening Soon · Public Preview Active · Waitlist Open',
  outbidGuarantee: 'Outbid deposits will be automatically refunded in full upon official auction launch.'
} as const;
