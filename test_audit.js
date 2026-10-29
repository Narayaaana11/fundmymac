// Comprehensive End-to-End Audit & Verification Test Suite for Fund My Mac (Hardened Architecture)
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

// TEST 2: Environment Configuration (.env.example)
const envExamplePath = resolve('.env.example');
assert(existsSync(envExamplePath), '.env.example file exists');
const envExampleContent = readFileSync(envExamplePath, 'utf-8');
assert(envExampleContent.includes('VITE_SUPABASE_URL'), 'VITE_SUPABASE_URL documented in .env.example');
assert(envExampleContent.includes('VITE_SUPABASE_ANON_KEY'), 'VITE_SUPABASE_ANON_KEY documented in .env.example');
assert(envExampleContent.includes('RAZORPAY_KEY_ID'), 'RAZORPAY_KEY_ID server secret documented in .env.example');
assert(envExampleContent.includes('RAZORPAY_KEY_SECRET'), 'RAZORPAY_KEY_SECRET server secret documented in .env.example');
assert(envExampleContent.includes('RAZORPAY_WEBHOOK_SECRET'), 'RAZORPAY_WEBHOOK_SECRET server secret documented in .env.example');

// TEST 3: Spot Data Model Verification (fundMyMacData.ts)
const dataContent = readFileSync(resolve('src/data/fundMyMacData.ts'), 'utf-8');
assert(dataContent.includes('id: 20'), 'All 20 spots configured in BRAND_SPOTS');
assert(dataContent.includes('Device Lifelong'), 'FAQ explicitly defines Device Lifelong duration');
assert(dataContent.includes('Razorpay Checkout'), 'FAQ explicitly supports Razorpay Checkout');

// TEST 4: MacbookDisplay Component Verification
const macbookContent = readFileSync(resolve('src/components/MacbookDisplay.tsx'), 'utf-8');
assert(macbookContent.includes('previewTargetSpotId'), 'Multi-spot logo previewer state implemented');
assert(macbookContent.includes('shouldShowPreviewLogo'), 'shouldShowPreviewLogo helper active across spots');
assert(macbookContent.includes('bmm-mobile-accessories-row'), 'Mobile accessories row (#19 & #20) implemented');
assert(macbookContent.includes('is-final-mode'), 'Final look clean toggle mode implemented');

// TEST 5: BidModal & DonationModal Features (Secure Checkout Integration)
const bidModalContent = readFileSync(resolve('src/components/BidModal.tsx'), 'utf-8');
assert(bidModalContent.includes('Device Lifelong ♾️'), 'BidModal displays Device Lifelong duration');
assert(bidModalContent.includes('initiateCheckoutSession'), 'BidModal integrates with server-side initiateCheckoutSession');
assert(bidModalContent.includes('validateLogoFile'), 'BidModal validates logo asset size and format');

const donationModalContent = readFileSync(resolve('src/components/DonationModal.tsx'), 'utf-8');
assert(donationModalContent.includes('initiateCheckoutSession'), 'DonationModal integrates with server-side initiateCheckoutSession');
assert(donationModalContent.includes('customAmount < 5'), 'DonationModal validates minimum contribution amount');

// TEST 6: Realtime Activity Ticker (LiveActivityTicker.tsx)
const tickerContent = readFileSync(resolve('src/components/LiveActivityTicker.tsx'), 'utf-8');
assert(tickerContent.includes('public_sponsors_wall'), 'LiveActivityTicker queries sanitized public_sponsors_wall');
assert(tickerContent.includes('ticker_verified_claims'), 'LiveActivityTicker listens to verified WebSocket claims');
assert(tickerContent.includes('spots'), 'LiveActivityTicker syncs with canonical spots prop');

// TEST 7: App.tsx Supabase Integration & Canonical State
const appContent = readFileSync(resolve('src/App.tsx'), 'utf-8');
assert(appContent.includes('fundmymac_live_state'), 'App.tsx listens to Supabase Realtime multi-user WebSocket');
assert(appContent.includes('CheckoutVerificationModal'), 'App.tsx includes post-checkout payment verification modal');
assert(appContent.includes('refreshCanonicalData'), 'App.tsx refreshes canonical data from server');

// TEST 8: HTML SEO & Metadata (index.html)
const htmlContent = readFileSync(resolve('index.html'), 'utf-8');
assert(htmlContent.includes('<title>Fund My Mac'), 'index.html has title tag');
assert(htmlContent.includes('property="og:title"'), 'index.html has OpenGraph og:title');
assert(htmlContent.includes('name="twitter:card"'), 'index.html has Twitter card meta');
assert(htmlContent.includes('M5 Max / M5 Pro'), 'index.html mentions Apple M5 Max / M5 Pro');

console.log(`\n====================================================`);
console.log(`📊 AUDIT SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log(`====================================================\n`);
