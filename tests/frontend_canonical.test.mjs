// =========================================================================
// Automated Test Suite: Frontend Canonical State & Trustworthy UI Verification
// =========================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BRAND_SPOTS } from '../src/data/fundMyMacData.ts';

describe('Frontend Canonical State & Trustworthy UI Verification', () => {
  test('All 20 MacBook spots are configured with dimensions and surface targets', () => {
    assert.equal(BRAND_SPOTS.length, 20, 'Exact 20 spots defined in BRAND_SPOTS');
    const lidSpots = BRAND_SPOTS.filter((s) => s.surface === 'lid');
    const insideSpots = BRAND_SPOTS.filter((s) => s.surface === 'inside');
    const accessorySpots = BRAND_SPOTS.filter((s) => s.surface === 'accessory');

    assert.equal(lidSpots.length, 10, '10 Lid spots');
    assert.equal(insideSpots.length, 8, '8 Inside palm rest spots');
    assert.equal(accessorySpots.length, 2, '2 Accessory spots (charger & mouse)');

    BRAND_SPOTS.forEach((spot) => {
      assert.ok(spot.dimensions, `Spot ${spot.id} must define physical dimensions`);
      assert.ok(spot.topBidUsd > 0, `Spot ${spot.id} must have USD price`);
      assert.ok(spot.topBidEur > 0, `Spot ${spot.id} must have EUR price`);
    });
  });

  test('App.tsx does NOT use localStorage as authoritative state for spots or raised totals', () => {
    const appContent = readFileSync(resolve('src/App.tsx'), 'utf8');
    assert.doesNotMatch(appContent, /localStorage\.getItem\(['"]bmm_spots_state['"]\)/, 'No localStorage authority for spots state');
    assert.doesNotMatch(appContent, /localStorage\.getItem\(['"]bmm_raised_usd['"]\)/, 'No localStorage authority for raised USD');
  });

  test('BidModal does not allow outbidding or overwriting permanently sold spots', () => {
    const bidModalContent = readFileSync(resolve('src/components/BidModal.tsx'), 'utf8');
    assert.doesNotMatch(bidModalContent, /Outbid \/ Replace Spot Sponsorship/, 'Outbid/replace spot form removed');
    assert.match(bidModalContent, /Confirmed Sponsor:/, 'Confirmed sponsor section displayed for sold spots');
    assert.match(bidModalContent, /permanently locked for the lifetime of this machine/, 'Clear explanation that spots are permanent');
  });

  test('AuctionSection derives open spots count dynamically from canonical inventory', () => {
    const auctionContent = readFileSync(resolve('src/components/AuctionSection.tsx'), 'utf8');
    assert.doesNotMatch(auctionContent, /<span>· 20 of 20 Sticker Spots Open for Sponsorship<\/span>/, 'No hardcoded 20 of 20 text');
    assert.match(auctionContent, /activeSpots\.filter\(\(s\)\s*=>\s*!s\.isSold\)\.length/, 'Dynamically filters unsold spots');
  });

  test('LiveActivityTicker clearly distinguishes verified sponsors from campaign announcements', () => {
    const tickerContent = readFileSync(resolve('src/components/LiveActivityTicker.tsx'), 'utf8');
    assert.match(tickerContent, /VERIFIED BACKER/, 'Verified backer badge for real claims');
    assert.match(tickerContent, /CAMPAIGN UPDATE/, 'Campaign update badge for announcements');
  });

  test('DonationModal enforces minimum contribution amount', () => {
    const donationContent = readFileSync(resolve('src/components/DonationModal.tsx'), 'utf8');
    assert.match(donationContent, /customAmount < 5/, 'Enforces minimum donation validation');
    assert.match(donationContent, /Minimum contribution is 5/, 'Minimum error messaging present');
  });
});
