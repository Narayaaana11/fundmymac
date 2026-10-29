// =========================================================================
// Server-Side Canonical Catalog & Pricing
// The browser is NEVER trusted to dictate spot or tier prices.
// =========================================================================

import type { CanonicalSpot, CanonicalTier, CurrencyCode } from './types.ts';

export const CANONICAL_SPOTS: Record<number, CanonicalSpot> = {
  1: { id: 1, name: 'Top-Left Banner', surface: 'lid', priceUsdCents: 25000, priceEurCents: 23000 },
  2: { id: 2, name: 'Marquee — Above Apple Logo', surface: 'lid', priceUsdCents: 50000, priceEurCents: 46000 },
  3: { id: 3, name: 'Top-Right Banner', surface: 'lid', priceUsdCents: 25000, priceEurCents: 23000 },
  4: { id: 4, name: 'Upper Left Mini-Strip', surface: 'lid', priceUsdCents: 10000, priceEurCents: 9000 },
  5: { id: 5, name: 'Upper Right Mini-Strip', surface: 'lid', priceUsdCents: 10000, priceEurCents: 9000 },
  6: { id: 6, name: 'Mid Left Flank', surface: 'lid', priceUsdCents: 17500, priceEurCents: 16000 },
  7: { id: 7, name: 'Mid Right Flank', surface: 'lid', priceUsdCents: 17500, priceEurCents: 16000 },
  8: { id: 8, name: 'Apple Left Adjacent', surface: 'lid', priceUsdCents: 15000, priceEurCents: 13800 },
  9: { id: 9, name: 'Apple Right Adjacent', surface: 'lid', priceUsdCents: 15000, priceEurCents: 13800 },
  10: { id: 10, name: 'Lower Deck Center', surface: 'lid', priceUsdCents: 22500, priceEurCents: 21000 },
  11: { id: 11, name: 'Left Palm Outer Top', surface: 'inside', priceUsdCents: 10000, priceEurCents: 9000 },
  12: { id: 12, name: 'Left Palm Outer Bottom', surface: 'inside', priceUsdCents: 10000, priceEurCents: 9000 },
  13: { id: 13, name: 'Left Palm Inner Top', surface: 'inside', priceUsdCents: 10000, priceEurCents: 9000 },
  14: { id: 14, name: 'Left Palm Inner Bottom', surface: 'inside', priceUsdCents: 10000, priceEurCents: 9000 },
  15: { id: 15, name: 'Right Palm Inner Top', surface: 'inside', priceUsdCents: 10000, priceEurCents: 9000 },
  16: { id: 16, name: 'Right Palm Inner Bottom', surface: 'inside', priceUsdCents: 10000, priceEurCents: 9000 },
  17: { id: 17, name: 'Right Palm Outer Top', surface: 'inside', priceUsdCents: 10000, priceEurCents: 9000 },
  18: { id: 18, name: 'Right Palm Outer Bottom', surface: 'inside', priceUsdCents: 10000, priceEurCents: 9000 },
  19: { id: 19, name: '140W Fast Charger Body', surface: 'accessory', priceUsdCents: 15000, priceEurCents: 13800 },
  20: { id: 20, name: 'Magic Mouse Curved Top', surface: 'accessory', priceUsdCents: 9900, priceEurCents: 9000 }
};

export const CANONICAL_TIERS: Record<string, CanonicalTier> = {
  corner: { id: 'corner', name: 'The Corner Sponsor', priceUsdCents: 7500, priceEurCents: 6900 },
  charger: { id: 'charger', name: '140W Fast Charger Partner', priceUsdCents: 15000, priceEurCents: 13800 },
  palm: { id: 'palm', name: 'Dual Palm Rest Sponsor', priceUsdCents: 17500, priceEurCents: 16000 },
  lid: { id: 'lid', name: 'Exterior Lid Prime Sponsor', priceUsdCents: 25000, priceEurCents: 23000 },
  title: { id: 'title', name: 'Marquee Title Partner', priceUsdCents: 50000, priceEurCents: 46000 }
};

export const MIN_DONATION_CENTS = 500; // $5.00 or €5.00

export function getCanonicalSpotAmount(spotId: number, currency: CurrencyCode): number {
  const spot = CANONICAL_SPOTS[spotId];
  if (!spot) {
    throw new Error(`Invalid spot ID: ${spotId}`);
  }
  return currency === 'eur' ? spot.priceEurCents : spot.priceUsdCents;
}

export function getCanonicalTierAmount(tierId: string, currency: CurrencyCode): number {
  const tier = CANONICAL_TIERS[tierId];
  if (!tier) {
    throw new Error(`Invalid tier ID: ${tierId}`);
  }
  return currency === 'eur' ? tier.priceEurCents : tier.priceUsdCents;
}
