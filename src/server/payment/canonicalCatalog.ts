// =========================================================================
// Server-Side Canonical Catalog & Pricing
// The browser is NEVER trusted to dictate spot or tier prices.
// Amounts are specified in integer minor currency units:
// - INR: paise (1 INR = 100 paise)
// - USD: cents (1 USD = 100 cents)
// - EUR: cents (1 EUR = 100 cents)
// =========================================================================

import type { CanonicalSpot, CanonicalTier, CurrencyCode } from './types.ts';

export const CANONICAL_SPOTS: Record<number, CanonicalSpot> = {
  1: { id: 1, name: 'Top-Left Banner', surface: 'lid', priceInrPaise: 2100000, priceUsdCents: 25000, priceEurCents: 23000 },
  2: { id: 2, name: 'Marquee — Above Apple Logo', surface: 'lid', priceInrPaise: 4200000, priceUsdCents: 50000, priceEurCents: 46000 },
  3: { id: 3, name: 'Top-Right Banner', surface: 'lid', priceInrPaise: 2100000, priceUsdCents: 25000, priceEurCents: 23000 },
  4: { id: 4, name: 'Upper Left Mini-Strip', surface: 'lid', priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000 },
  5: { id: 5, name: 'Upper Right Mini-Strip', surface: 'lid', priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000 },
  6: { id: 6, name: 'Mid Left Flank', surface: 'lid', priceInrPaise: 1500000, priceUsdCents: 17500, priceEurCents: 16000 },
  7: { id: 7, name: 'Mid Right Flank', surface: 'lid', priceInrPaise: 1500000, priceUsdCents: 17500, priceEurCents: 16000 },
  8: { id: 8, name: 'Apple Left Adjacent', surface: 'lid', priceInrPaise: 1250000, priceUsdCents: 15000, priceEurCents: 13800 },
  9: { id: 9, name: 'Apple Right Adjacent', surface: 'lid', priceInrPaise: 1250000, priceUsdCents: 15000, priceEurCents: 13800 },
  10: { id: 10, name: 'Lower Deck Center', surface: 'lid', priceInrPaise: 1900000, priceUsdCents: 22500, priceEurCents: 21000 },
  11: { id: 11, name: 'Left Palm Outer Top', surface: 'inside', priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000 },
  12: { id: 12, name: 'Left Palm Outer Bottom', surface: 'inside', priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000 },
  13: { id: 13, name: 'Left Palm Inner Top', surface: 'inside', priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000 },
  14: { id: 14, name: 'Left Palm Inner Bottom', surface: 'inside', priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000 },
  15: { id: 15, name: 'Right Palm Inner Top', surface: 'inside', priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000 },
  16: { id: 16, name: 'Right Palm Inner Bottom', surface: 'inside', priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000 },
  17: { id: 17, name: 'Right Palm Outer Top', surface: 'inside', priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000 },
  18: { id: 18, name: 'Right Palm Outer Bottom', surface: 'inside', priceInrPaise: 850000, priceUsdCents: 10000, priceEurCents: 9000 },
  19: { id: 19, name: '140W Fast Charger Body', surface: 'accessory', priceInrPaise: 1250000, priceUsdCents: 15000, priceEurCents: 13800 },
  20: { id: 20, name: 'Magic Mouse Curved Top', surface: 'accessory', priceInrPaise: 800000, priceUsdCents: 9900, priceEurCents: 9000 }
};

export const CANONICAL_TIERS: Record<string, CanonicalTier> = {
  corner: { id: 'corner', name: 'The Corner Sponsor', priceInrPaise: 600000, priceUsdCents: 7500, priceEurCents: 6900 },
  charger: { id: 'charger', name: '140W Fast Charger Partner', priceInrPaise: 1250000, priceUsdCents: 15000, priceEurCents: 13800 },
  palm: { id: 'palm', name: 'Dual Palm Rest Sponsor', priceInrPaise: 1500000, priceUsdCents: 17500, priceEurCents: 16000 },
  lid: { id: 'lid', name: 'Exterior Lid Prime Sponsor', priceInrPaise: 2100000, priceUsdCents: 25000, priceEurCents: 23000 },
  title: { id: 'title', name: 'Marquee Title Partner', priceInrPaise: 4200000, priceUsdCents: 50000, priceEurCents: 46000 }
};

export const MIN_DONATION_BY_CURRENCY: Record<CurrencyCode, number> = {
  inr: 50000, // ₹500 (50,000 paise)
  usd: 500,   // $5.00 (500 cents)
  eur: 500    // €5.00 (500 cents)
};

export const MIN_DONATION_CENTS = 500; // Legacy backwards compatibility

export function getCanonicalSpotAmount(spotId: number, currency: CurrencyCode): number {
  const spot = CANONICAL_SPOTS[spotId];
  if (!spot) {
    throw new Error(`Invalid spot ID: ${spotId}`);
  }
  if (currency === 'inr') return spot.priceInrPaise;
  if (currency === 'eur') return spot.priceEurCents;
  return spot.priceUsdCents;
}

export function getCanonicalTierAmount(tierId: string, currency: CurrencyCode): number {
  const tier = CANONICAL_TIERS[tierId];
  if (!tier) {
    throw new Error(`Invalid tier ID: ${tierId}`);
  }
  if (currency === 'inr') return tier.priceInrPaise;
  if (currency === 'eur') return tier.priceEurCents;
  return tier.priceUsdCents;
}

export function getMinimumDonationAmount(currency: CurrencyCode): number {
  return MIN_DONATION_BY_CURRENCY[currency] || 500;
}
