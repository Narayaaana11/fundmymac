// =========================================================================
// Automated Visual & UI/UX Audit Tool — Playwright
// Inspects rendered DOM, responsive viewports, console logs, modals, and layout overflow.
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
  console.log('🚀 Launching Chromium for Visual Audit...');
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

  // 1. Check Console Logs
  console.log('\n--- 1. CONSOLE LOGS & RUNTIME DIAGNOSTICS ---');
  console.log(`Console messages captured: ${consoleLogs.length}`);
  const errors = consoleLogs.filter(l => l.type === 'error');
  const warnings = consoleLogs.filter(l => l.type === 'warning');
  console.log(`Errors: ${errors.length}, Warnings: ${warnings.length}, Page Exceptions: ${pageErrors.length}`);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }
  if (warnings.length > 0) {
    console.log('Warnings:', warnings);
  }
  if (pageErrors.length > 0) {
    console.log('Page Exceptions:', pageErrors);
  }

  // 2. Responsive Viewport Audits & Horizontal Overflow
  console.log('\n--- 2. RESPONSIVE VIEWPORT AUDIT & OVERFLOW CHECKS ---');
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
    console.log(`[${status}] Viewport ${vp.name} (${vp.width}x${vp.height}): docWidth=${overflow.docWidth}, scrollWidth=${overflow.scrollWidth}`);
    if (overflow.hasHorizontalScroll) {
      console.log(`   👉 Offending elements:`, JSON.stringify(overflow.offendingElements));
    }

    const screenshotPath = path.join(SCREENSHOTS_DIR, `${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
  }

  // 3. Inspect Component Elements & Accessibility Properties
  console.log('\n--- 3. COMPONENT & ACCESSIBILITY INSPECTION ---');
  await page.setViewportSize({ width: 1440, height: 900 });

  const a11ySummary = await page.evaluate(() => {
    // Images missing alt
    const images = Array.from(document.querySelectorAll('img'));
    const imagesMissingAlt = images.filter(img => !img.hasAttribute('alt'));

    // Buttons missing accessible name
    const buttons = Array.from(document.querySelectorAll('button'));
    const buttonsMissingName = buttons.filter(btn => {
      const text = btn.innerText?.trim();
      const ariaLabel = btn.getAttribute('aria-label');
      const ariaLabelledby = btn.getAttribute('aria-labelledby');
      const title = btn.getAttribute('title');
      return !text && !ariaLabel && !ariaLabelledby && !title;
    });

    // Heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
      tag: h.tagName,
      text: h.textContent?.trim().slice(0, 40)
    }));

    // Interactive targets smaller than 44x44
    const smallTargets = buttons.filter(btn => {
      const rect = btn.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32);
    }).map(btn => ({
      text: btn.innerText?.slice(0, 20) || btn.getAttribute('aria-label'),
      rect: { width: Math.round(btn.getBoundingClientRect().width), height: Math.round(btn.getBoundingClientRect().height) }
    }));

    return {
      totalImages: images.length,
      imagesMissingAltCount: imagesMissingAlt.length,
      imagesMissingAlt: imagesMissingAlt.map(img => img.src.slice(-40)),
      totalButtons: buttons.length,
      buttonsMissingNameCount: buttonsMissingName.length,
      headings,
      smallTargetsCount: smallTargets.length,
      smallTargets: smallTargets.slice(0, 10)
    };
  });

  console.log(`Images total: ${a11ySummary.totalImages}, Missing alt: ${a11ySummary.imagesMissingAltCount}`);
  if (a11ySummary.imagesMissingAltCount > 0) {
    console.log('Images missing alt:', a11ySummary.imagesMissingAlt);
  }
  console.log(`Buttons total: ${a11ySummary.totalButtons}, Missing accessible name: ${a11ySummary.buttonsMissingNameCount}`);
  console.log(`Buttons below 32px touch target: ${a11ySummary.smallTargetsCount}`);
  if (a11ySummary.smallTargetsCount > 0) {
    console.log('Sample small touch targets:', a11ySummary.smallTargets);
  }
  console.log('Headings hierarchy:', a11ySummary.headings);

  // 4. Modal Interactions: BidModal
  console.log('\n--- 4. MODAL INTERACTION AUDIT ---');
  console.log('Testing BidModal...');
  // Click on available spot button in auction section
  const spotBtn = page.locator('.bmm-claim-spot-btn').first();
  if (await spotBtn.count() > 0) {
    await spotBtn.click();
    await page.waitForTimeout(400);

    const bidModalVisible = await page.locator('.bmm-modal-overlay').isVisible();
    console.log(`BidModal opened successfully: ${bidModalVisible}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'modal-bid.png') });

    // Test Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const bidModalClosed = !(await page.locator('.bmm-modal-overlay').isVisible());
    console.log(`BidModal closed on Escape key: ${bidModalClosed}`);
  } else {
    console.log('No auction table button found to open BidModal');
  }

  // Testing DonationModal
  console.log('Testing DonationModal...');
  const fundBtn = page.locator('button:has-text("Fund This Mac")').first();
  if (await fundBtn.count() > 0) {
    await fundBtn.click();
    await page.waitForTimeout(400);

    const donationModalVisible = await page.locator('.bmm-modal-overlay').isVisible();
    console.log(`DonationModal opened successfully: ${donationModalVisible}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'modal-donation.png') });

    // Close button
    const closeBtn = page.locator('.bmm-modal-close').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(300);
      const donationModalClosed = !(await page.locator('.bmm-modal-overlay').isVisible());
      console.log(`DonationModal closed via close button: ${donationModalClosed}`);
    }
  }

  // Testing LegalPolicyModal
  console.log('Testing LegalPolicyModal...');
  const privacyLink = page.locator('button:has-text("Privacy Policy")').first();
  if (await privacyLink.count() > 0) {
    await privacyLink.click();
    await page.waitForTimeout(400);

    const legalModalVisible = await page.locator('.bmm-modal-overlay').isVisible();
    console.log(`LegalPolicyModal opened successfully: ${legalModalVisible}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'modal-legal.png') });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const legalModalClosed = !(await page.locator('.bmm-modal-overlay').isVisible());
    console.log(`LegalPolicyModal closed on Escape key: ${legalModalClosed}`);
  }

  await browser.close();
  console.log('\n✅ Visual audit complete. Screenshots saved to audit_screenshots/\n');
}

runVisualAudit().catch(err => {
  console.error('Visual audit failed:', err);
  process.exit(1);
});
