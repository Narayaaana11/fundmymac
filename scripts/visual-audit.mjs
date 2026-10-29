// =========================================================================
// Comprehensive Visual & UI/UX Audit & Interaction Verification Suite
// Inspects full-page screenshots across 7 viewports, section-by-section renders,
// interaction states, currency switches, form validations, and keyboard flows.
// =========================================================================

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'audit_screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'small-mobile', width: 320, height: 568 },
  { name: 'typical-mobile', width: 375, height: 812 },
  { name: 'large-mobile', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'large-desktop', width: 1920, height: 1080 }
];

async function runVisualAudit() {
  console.log('🚀 Launching Chromium for Comprehensive Visual & Interaction Audit...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  console.log('🌐 Navigating to http://[::1]:5173...');
  await page.goto('http://[::1]:5173', { waitUntil: 'networkidle' });

  // 1. Console & Network Errors
  console.log('\n--- 1. CONSOLE LOGS & RUNTIME DIAGNOSTICS ---');
  const errors = consoleLogs.filter(l => l.type === 'error');
  const warnings = consoleLogs.filter(l => l.type === 'warning');
  console.log(`Console messages: ${consoleLogs.length} (Errors: ${errors.length}, Warnings: ${warnings.length}, Exceptions: ${pageErrors.length})`);
  if (errors.length > 0) {
    console.log('Console Errors Sample:', errors.slice(0, 5));
  }

  // 2. Full-Page Screenshots & Horizontal Overflow across 7 Viewports
  console.log('\n--- 2. RESPONSIVE VIEWPORT FULL-PAGE SCREENSHOTS & OVERFLOW CHECKS ---');
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    const overflow = await page.evaluate(() => {
      const docWidth = document.documentElement.offsetWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const elementsWithOverflow = [];
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.scrollWidth > window.innerWidth) {
          elementsWithOverflow.push({
            tag: el.tagName,
            id: el.id,
            className: el.className?.toString().slice(0, 50),
            scrollWidth: el.scrollWidth,
            windowWidth: window.innerWidth
          });
        }
      }
      return {
        docWidth,
        scrollWidth,
        hasHorizontalScroll: scrollWidth > docWidth + 1,
        offendingElements: elementsWithOverflow.slice(0, 5)
      };
    });

    const status = overflow.hasHorizontalScroll ? '❌ OVERFLOW' : '✅ CLEAN';
    console.log(`[${status}] ${vp.name} (${vp.width}x${vp.height}): docWidth=${overflow.docWidth}, scrollWidth=${overflow.scrollWidth}`);
    if (overflow.hasHorizontalScroll) {
      console.log(`   👉 Offending elements:`, JSON.stringify(overflow.offendingElements));
    }

    const fullPagePath = path.join(SCREENSHOTS_DIR, `fullpage-${vp.width}x${vp.height}.png`);
    await page.screenshot({ path: fullPagePath, fullPage: true });
  }

  // 3. Section-by-Section Visual Captures (at 1440x900)
  console.log('\n--- 3. SECTION-BY-SECTION VISUAL AUDIT (1440x900) ---');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(200);

  const sections = [
    { name: 'section-01-hero', selector: '.bmm-hero' },
    { name: 'section-02-macbook-display', selector: '#macbook-showcase' },
    { name: 'section-03-mission-story', selector: '#vesper-mission' },
    { name: 'section-04-events-roadmap', selector: '#events' },
    { name: 'section-05-sponsors-wall', selector: '#sponsors' },
    { name: 'section-06-sponsor-tiers', selector: '#sponsor-tiers' },
    { name: 'section-07-auction-directory', selector: '#auction-table' },
    { name: 'section-08-how-it-works', selector: '#how-it-works' },
    { name: 'section-09-machine-specs', selector: '#machine-specs' },
    { name: 'section-10-faq-accordion', selector: '#faq' },
    { name: 'section-11-footer', selector: 'footer.bmm-footer' }
  ];

  for (const s of sections) {
    const el = page.locator(s.selector).first();
    if (await el.count() > 0) {
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const sectionPath = path.join(SCREENSHOTS_DIR, `${s.name}.png`);
      await el.screenshot({ path: sectionPath });
      console.log(`[SAVED] ${s.name}.png`);
    } else {
      console.log(`[SKIPPED] Selector ${s.selector} not found`);
    }
  }

  // 4. Test Real Interaction States
  console.log('\n--- 4. INTERACTION STATES & UI WORKFLOW TESTING ---');

  // A. Mobile Hamburger Drawer Test (375x812)
  console.log('Testing Mobile Drawer...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(200);
  const hamburgerBtn = page.locator('.bmm-mobile-toggle').first();
  if (await hamburgerBtn.count() > 0) {
    await hamburgerBtn.click();
    await page.waitForTimeout(300);
    const drawerOpen = await page.locator('.bmm-mobile-drawer').isVisible();
    console.log(`Mobile drawer opened: ${drawerOpen}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'interaction-mobile-drawer.png') });
    // Close drawer
    await hamburgerBtn.click();
    await page.waitForTimeout(200);
  }

  // Reset to desktop viewport for remaining interaction tests
  await page.setViewportSize({ width: 1440, height: 900 });

  // B. Currency Switching Verification (INR, EUR, USD)
  console.log('Testing Currency Switching...');
  const inrBtn = page.locator('.bmm-curr-btn:has-text("₹")').first();
  const eurBtn = page.locator('.bmm-curr-btn:has-text("€")').first();
  const usdBtn = page.locator('.bmm-curr-btn:has-text("$")').first();

  if (await inrBtn.count() > 0) {
    await inrBtn.click();
    await page.waitForTimeout(200);
    const heroRaisedInr = await page.locator('.bmm-progress-raised').innerText();
    console.log(`Active INR Raised Value: "${heroRaisedInr}"`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'interaction-currency-inr.png') });
  }

  if (await eurBtn.count() > 0) {
    await eurBtn.click();
    await page.waitForTimeout(200);
    const heroRaisedEur = await page.locator('.bmm-progress-raised').innerText();
    console.log(`Active EUR Raised Value: "${heroRaisedEur}"`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'interaction-currency-eur.png') });
  }

  if (await usdBtn.count() > 0) {
    await usdBtn.click();
    await page.waitForTimeout(200);
    const heroRaisedUsd = await page.locator('.bmm-progress-raised').innerText();
    console.log(`Active USD Raised Value: "${heroRaisedUsd}"`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'interaction-currency-usd.png') });
  }

  // C. MacBook Surface & Mode Toggles
  console.log('Testing MacBook Surface & Mode Toggles...');
  const insideBtn = page.locator('.bmm-pill-btn:has-text("Inside")').first();
  if (await insideBtn.count() > 0) {
    await insideBtn.click();
    await page.waitForTimeout(300);
    const macbookEl = page.locator('#macbook-showcase').first();
    await macbookEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'interaction-macbook-inside.png') });
    console.log('MacBook Inside surface rendered and captured');
  }

  const lidBtn = page.locator('.bmm-pill-btn:has-text("Lid")').first();
  if (await lidBtn.count() > 0) {
    await lidBtn.click();
    await page.waitForTimeout(300);
  }

  const finalLookBtn = page.locator('.bmm-pill-btn:has-text("Final look")').first();
  if (await finalLookBtn.count() > 0) {
    await finalLookBtn.click();
    await page.waitForTimeout(300);
    const macbookEl = page.locator('#macbook-showcase').first();
    await macbookEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'interaction-macbook-final-look.png') });
    console.log('MacBook Final Look mode rendered and captured');

    // Switch back to auction view
    const auctionModeBtn = page.locator('.bmm-pill-btn:has-text("The auction")').first();
    if (await auctionModeBtn.count() > 0) await auctionModeBtn.click();
  }

  // D. FAQ Accordion Interaction
  console.log('Testing FAQ Accordion...');
  const faqBtn = page.locator('.bmm-faq-question').first();
  if (await faqBtn.count() > 0) {
    const isExpandedBefore = await faqBtn.getAttribute('aria-expanded');
    await faqBtn.click();
    await page.waitForTimeout(200);
    const isExpandedAfter = await faqBtn.getAttribute('aria-expanded');
    console.log(`FAQ Accordion aria-expanded before: ${isExpandedBefore}, after: ${isExpandedAfter}`);
    const faqSection = page.locator('#faq').first();
    await faqSection.screenshot({ path: path.join(SCREENSHOTS_DIR, 'interaction-faq-open.png') });
  }

  // E. Spot Directory Search & Filter
  console.log('Testing Spot Directory Search...');
  const searchInput = page.locator('.filter-search-input').first();
  if (await searchInput.count() > 0) {
    await searchInput.fill('Lid Prime');
    await page.waitForTimeout(200);
    const matchingRows = await page.locator('.bmm-spot-row').count();
    console.log(`Directory search for "Lid Prime" returned: ${matchingRows} spots`);
    const directoryCard = page.locator('.bmm-bids-table-card').first();
    await directoryCard.screenshot({ path: path.join(SCREENSHOTS_DIR, 'interaction-directory-filtered.png') });
    await searchInput.fill('');
    await page.waitForTimeout(200);
  }

  // F. BidModal Validation Testing
  console.log('Testing BidModal Form Validation...');
  const spotClaimBtn = page.locator('.bmm-claim-spot-btn').first();
  if (await spotClaimBtn.count() > 0) {
    await spotClaimBtn.click();
    await page.waitForTimeout(300);

    const submitBtn = page.locator('button:has-text("Proceed to Secure Checkout")').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(200);
      const invalidCount = await page.locator('input:invalid').count();
      const errorText = await page.locator('.bmm-error-banner').innerText().catch(() => '');
      console.log(`BidModal form blocked on empty fields (HTML5 invalid inputs: ${invalidCount}, error banner: "${errorText.trim()}")`);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'interaction-bid-validation-error.png') });
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // G. DonationModal Preset Chips & Custom Input Testing
  console.log('Testing DonationModal Presets & Inputs...');
  const donateBtn = page.locator('button:has-text("Fund This Mac")').first();
  if (await donateBtn.count() > 0) {
    await donateBtn.click();
    await page.waitForTimeout(300);

    const presetChip = page.locator('.amount-preset-chip').nth(2);
    if (await presetChip.count() > 0) {
      const chipValue = await presetChip.innerText();
      await presetChip.click();
      await page.waitForTimeout(200);
      console.log(`Selected Donation Preset Chip: ${chipValue}`);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'interaction-donation-preset.png') });

    const closeBtn = page.locator('.bmm-modal-close').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // H. Legal Policy Modal Tab Switching
  console.log('Testing Legal Policy Modal Tab Switching...');
  const termsBtn = page.locator('button:has-text("Terms of Sponsorship")').first();
  if (await termsBtn.count() > 0) {
    await termsBtn.click();
    await page.waitForTimeout(300);

    // Switch to refund policy
    const refundTab = page.locator('.filter-pill-btn:has-text("Cancellation & Refund")').first();
    if (await refundTab.count() > 0) {
      await refundTab.click();
      await page.waitForTimeout(200);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'interaction-legal-tabs.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  await browser.close();
  console.log('\n🎉 Comprehensive visual and interaction audit complete! All screenshots saved.\n');
}

runVisualAudit().catch(err => {
  console.error('Visual audit failed:', err);
  process.exit(1);
});
