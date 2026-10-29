/**
 * =========================================================================
 * Fund My Mac: Public Preview Configuration & Single Source of Truth
 * =========================================================================
 * 
 * Razorpay merchant approval is pending. Live payments and numerical price displays
 * are disabled across the public preview site. Visitors can browse campaign spaces,
 * view perks, and join the priority waitlist.
 */

export const IS_PUBLIC_PREVIEW = true;

export const PREVIEW_COPY = {
  campaignName: 'Fund My Mac',
  heroTagline: 'Be part of the beginning.',
  heroDescription:
    "We're preparing a new sponsorship campaign. Explore the available spaces, express your interest, and be among the first to hear when sponsorships officially open.",
  heroSupportHeading: 'Sponsorships opening soon',
  heroSupportBody:
    'Pricing and checkout will be announced once the campaign is ready to launch.',
  ctaPrimary: 'Join the Waitlist',
  ctaSecondary: 'Explore Sponsorship Spaces',
  pricingBadge: 'Pricing Coming Soon',
  actionComingSoon: 'Coming Soon',
  spotStatus: 'Opening Soon',
  availabilityNotice: 'Sponsorships opening soon. Priority reservation opens to waitlist members first.',
  enquirySuccess: "You're on the waitlist! We'll notify you as soon as sponsorships officially open."
} as const;
