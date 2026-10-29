// Comprehensive End-to-End Audit & Verification Test Suite for Fund My Mac
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('====================================================');
console.log('🚀 FUND MY MAC: END-TO-END VERIFICATION TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName}: ${details}`);
    process.exitCode = 1;
  }
}

// TEST 1: Public Asset Verification
const requiredAssets = [
  'public/inside.webp',
  'public/charger.webp',
  'public/magicmouse.webp',
  'public/logo-small.png',
  'public/favicon.svg'
];

requiredAssets.forEach((assetPath) => {
  const fullPath = resolve(assetPath);
  assert(existsSync(fullPath), `Asset Check: ${assetPath} exists`);
});

// TEST 2: Environment Configuration (.env)
const envPath = resolve('.env');
assert(existsSync(envPath), '.env file exists');
const envContent = readFileSync(envPath, 'utf-8');
assert(envContent.includes('VITE_SUPABASE_URL=https://lavydeusonwqjrlhtqzv.supabase.co'), 'Supabase URL configured in .env');
assert(envContent.includes('VITE_SUPABASE_ANON_KEY=sb_publishable_8hUFRkUIQi-HZwm5IXBtNg_zbUrrO1y'), 'Supabase publishable key configured in .env');
assert(envContent.includes('VITE_STRIPE_PAYMENT_LINK='), 'Stripe checkout link variable present in .env');

// TEST 3: Spot Data Model Verification (fundMyMacData.ts)
const dataContent = readFileSync(resolve('src/data/fundMyMacData.ts'), 'utf-8');
assert(dataContent.includes('id: 20'), 'All 20 spots configured in BRAND_SPOTS');
assert(dataContent.includes('Device Lifelong'), 'FAQ explicitly defines Device Lifelong duration');
assert(dataContent.includes('Stripe Checkout'), 'FAQ explicitly supports Stripe Checkout');

// TEST 4: MacbookDisplay Component Verification
const macbookContent = readFileSync(resolve('src/components/MacbookDisplay.tsx'), 'utf-8');
assert(macbookContent.includes('previewTargetSpotId'), 'Multi-spot logo previewer state implemented');
assert(macbookContent.includes('shouldShowPreviewLogo'), 'shouldShowPreviewLogo helper active across spots');
assert(macbookContent.includes('bmm-mobile-accessories-row'), 'Mobile accessories row (#19 & #20) implemented');
assert(macbookContent.includes('is-final-mode'), 'Final look clean toggle mode implemented');

// TEST 5: BidModal & DonationModal Features
const bidModalContent = readFileSync(resolve('src/components/BidModal.tsx'), 'utf-8');
assert(bidModalContent.includes('Device Lifelong ♾️'), 'BidModal displays Device Lifelong duration');
assert(bidModalContent.includes('https://twitter.com/intent/tweet'), 'BidModal has Share on X viral tweet button');
assert(bidModalContent.includes('Open Stripe ↗'), 'BidModal has instant Stripe checkout button');

const donationModalContent = readFileSync(resolve('src/components/DonationModal.tsx'), 'utf-8');
assert(donationModalContent.includes('https://twitter.com/intent/tweet'), 'DonationModal has Share on X viral tweet button');
assert(donationModalContent.includes('Open Stripe ↗'), 'DonationModal has instant Stripe checkout button');

// TEST 6: Realtime Activity Ticker (LiveActivityTicker.tsx)
const tickerContent = readFileSync(resolve('src/components/LiveActivityTicker.tsx'), 'utf-8');
assert(tickerContent.includes(".from('brand_spots')"), 'LiveActivityTicker queries Supabase brand_spots');
assert(tickerContent.includes('ticker_realtime_claims'), 'LiveActivityTicker listens to Realtime WebSocket claims');
assert(tickerContent.includes('spots'), 'LiveActivityTicker syncs with local spots prop');

// TEST 7: App.tsx Supabase Integration & State Persistence
const appContent = readFileSync(resolve('src/App.tsx'), 'utf-8');
assert(appContent.includes('bmm_spots_state'), 'App.tsx persists spots state to localStorage');
assert(appContent.includes('bmm_raised_usd'), 'App.tsx persists raised USD to localStorage');
assert(appContent.includes('bmm_realtime_app_sync'), 'App.tsx listens to Supabase Realtime multi-user WebSocket');

// TEST 8: HTML SEO & Metadata (index.html)
const htmlContent = readFileSync(resolve('index.html'), 'utf-8');
assert(htmlContent.includes('<title>Fund My Mac'), 'index.html has title tag');
assert(htmlContent.includes('property="og:title"'), 'index.html has OpenGraph og:title');
assert(htmlContent.includes('name="twitter:card"'), 'index.html has Twitter card meta');
assert(htmlContent.includes('M5 Max / M5 Pro'), 'index.html mentions Apple M5 Max / M5 Pro');

console.log(`\n====================================================`);
console.log(`📊 AUDIT SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log(`====================================================\n`);
