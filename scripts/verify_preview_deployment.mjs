import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_URL = 'https://fundmymac-pjcnj88xo-vesper-a7d9.vercel.app';
const SCREENSHOT_DIR = resolve('audit_screenshots/preview_verification');

if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verifyPreviewDeployment() {
  console.log('=== STARTING BROWSER AUDIT ON VERCEL PREVIEW DEPLOYMENT ===');
  console.log('Preview URL:', PREVIEW_URL);

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true
  });

  const consoleLogs = [];
  const networkErrors = [];

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text });
    if (type === 'error') {
      console.log(`[PREVIEW CONSOLE ERROR] ${text}`);
    }
  });

  page.on('requestfailed', req => {
    const err = req.failure()?.errorText || 'Unknown failure';
    networkErrors.push({ url: req.url(), error: err });
    console.log(`[PREVIEW NETWORK FAILED] ${req.url()} - ${err}`);
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      networkErrors.push({ url: res.url(), status: res.status() });
      console.log(`[PREVIEW HTTP ${res.status()}] ${res.url()}`);
    }
  });

  console.log('\nNavigating to Preview Deployment URL...');
  const res = await page.goto(PREVIEW_URL, { waitUntil: 'networkidle' });
  console.log('Response Status:', res.status());
  console.log('Page Title:', await page.title());

  await page.screenshot({ path: resolve(SCREENSHOT_DIR, '01_preview_desktop_home.png'), fullPage: true });

  // 1. Verify Public Preview restrictions
  const pageText = await page.locator('body').innerText();
  const hasPreviewNotice = pageText.includes('Public Preview') || pageText.includes('Coming Soon');
  const hasLeakedPrice = /\$430|\$135|\$45/.test(pageText);
  console.log('\n[STAGE 8] Preview Security Verification:');
  console.log('Public Preview Notice:', hasPreviewNotice);
  console.log('Leaked Prices ($430, $135, $45):', hasLeakedPrice);

  // 2. Test Navigation Links & CTAs
  console.log('\n[STAGE 4] Testing Navigation Links:');
  const navLinks = ['#waitlist', '#macbook-controls', '#corner', '#vesper-mission', '#events', '#faq'];
  for (const href of navLinks) {
    const link = page.locator(`a[href="${href}"]`).first();
    const count = await link.count();
    let targetExists = false;
    if (count > 0 && await link.isVisible()) {
      await link.click();
      await page.waitForTimeout(200);
      targetExists = await page.locator(href).count() > 0;
    } else {
      targetExists = await page.locator(href).count() > 0;
    }
    console.log(`Nav link ${href}: found=${count > 0}, targetExists=${targetExists}`);
  }

  // 3. Test MacBook Visualizer Surface Switching and Spots
  console.log('\n[STAGE 5] Testing MacBook Visualizer:');
  const lidBtn = page.locator('button.bmm-pill-btn:has-text("Lid")').first();
  const insideBtn = page.locator('button.bmm-pill-btn:has-text("Inside")').first();

  await lidBtn.click();
  await page.waitForTimeout(300);
  const lidSpots = await page.$$('.bmm-lid-grid .bmm-spot-box');
  console.log(`Lid spots count: ${lidSpots.length}`);

  const spotResults = [];

  for (let i = 0; i < lidSpots.length; i++) {
    const pin = lidSpots[i];
    const spotId = await pin.getAttribute('data-spot-id');
    const spotText = (await pin.innerText()).trim();
    await pin.hover();
    await page.waitForTimeout(50);
    await pin.click();
    await page.waitForTimeout(200);

    const modal = page.locator('.bmm-modal-card, [role="dialog"]').first();
    const modalVisible = await modal.isVisible().catch(() => false);
    let modalTitle = '';
    let hasPricingComingSoon = false;
    if (modalVisible) {
      modalTitle = (await modal.locator('h3, h2').first().innerText().catch(() => '')).trim();
      const modalText = await modal.innerText().catch(() => '');
      hasPricingComingSoon = modalText.includes('Pricing Coming Soon') || modalText.includes('Waitlist');
      const closeBtn = modal.locator('button:has-text("✕"), button[aria-label="Close"], button.bmm-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(150);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
      }
    }
    spotResults.push({
      spotId: Number(spotId) || (i + 1),
      surface: 'lid',
      label: spotText,
      modalOpened: modalVisible,
      modalTitle,
      pricingComingSoon: hasPricingComingSoon
    });
  }
  console.log(`Lid spots 1-10 tested: all preview safe = ${spotResults.every(s => s.pricingComingSoon)}`);

  // Switch to Inside
  await insideBtn.click();
  await page.waitForTimeout(300);
  const insideSpots = await page.$$('.bmm-inside-chassis .bmm-inside-spot');
  console.log(`Inside spots count: ${insideSpots.length}`);

  for (let i = 0; i < insideSpots.length; i++) {
    const pin = insideSpots[i];
    const spotId = await pin.getAttribute('data-spot-id');
    const spotText = (await pin.innerText()).trim();
    await pin.hover();
    await page.waitForTimeout(50);
    await pin.click();
    await page.waitForTimeout(200);

    const modal = page.locator('.bmm-modal-card, [role="dialog"]').first();
    const modalVisible = await modal.isVisible().catch(() => false);
    let modalTitle = '';
    let hasPricingComingSoon = false;
    if (modalVisible) {
      modalTitle = (await modal.locator('h3, h2').first().innerText().catch(() => '')).trim();
      const modalText = await modal.innerText().catch(() => '');
      hasPricingComingSoon = modalText.includes('Pricing Coming Soon') || modalText.includes('Waitlist');
      const closeBtn = modal.locator('button:has-text("✕"), button[aria-label="Close"], button.bmm-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(150);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
      }
    }
    spotResults.push({
      spotId: Number(spotId) || (i + 11),
      surface: 'inside',
      label: spotText,
      modalOpened: modalVisible,
      modalTitle,
      pricingComingSoon: hasPricingComingSoon
    });
  }
  console.log(`Inside spots 11-18 tested: all preview safe = ${spotResults.filter(s => s.surface === 'inside').every(s => s.pricingComingSoon)}`);

  // Test Accessories (19 & 20)
  const chargerSpot = page.locator('.bmm-charger-side .bmm-spot-box').first();
  if (await chargerSpot.isVisible()) {
    await chargerSpot.click();
    await page.waitForTimeout(200);
    const modal = page.locator('.bmm-modal-card, [role="dialog"]').first();
    const modalVisible = await modal.isVisible();
    const modalText = await modal.innerText().catch(() => '');
    spotResults.push({
      spotId: 19,
      surface: 'accessory',
      label: 'Charger',
      modalOpened: modalVisible,
      pricingComingSoon: modalText.includes('Pricing Coming Soon') || modalText.includes('Waitlist')
    });
    const closeBtn = modal.locator('button:has-text("✕"), button[aria-label="Close"], button.bmm-modal-close').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
  }

  const mouseSpot = page.locator('.bmm-mouse-side .bmm-spot-box').first();
  if (await mouseSpot.isVisible()) {
    await mouseSpot.click();
    await page.waitForTimeout(200);
    const modal = page.locator('.bmm-modal-card, [role="dialog"]').first();
    const modalVisible = await modal.isVisible();
    const modalText = await modal.innerText().catch(() => '');
    spotResults.push({
      spotId: 20,
      surface: 'accessory',
      label: 'Magic Mouse',
      modalOpened: modalVisible,
      pricingComingSoon: modalText.includes('Pricing Coming Soon') || modalText.includes('Waitlist')
    });
    const closeBtn = modal.locator('button:has-text("✕"), button[aria-label="Close"], button.bmm-modal-close').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
  }
  console.log(`Total Spots Audited: ${spotResults.length}/20, All Preview Safe: ${spotResults.every(s => s.pricingComingSoon)}`);

  // 4. Test Logo Tester
  console.log('\n[STAGE 5] Testing Logo Tester:');
  const testLogoBtn = page.locator('button:has-text("Test Logo")').first();
  if (await testLogoBtn.isVisible()) {
    await testLogoBtn.click();
    await page.waitForTimeout(300);
    const sampleBtn = page.locator('.bmm-sample-logo-btn, button:has-text("Brand A")').first();
    if (await sampleBtn.isVisible()) {
      await sampleBtn.click();
      await page.waitForTimeout(200);
      console.log('Sample logo clicked successfully without errors');
    }
    const closeTester = page.locator('button:has-text("✕"), button:has-text("Done"), button:has-text("Close")').first();
    if (await closeTester.isVisible()) await closeTester.click();
  }

  // 5. Test Finding B (Corner Takeover Modal)
  console.log('\n[STAGE 8] Testing Finding B (Corner Takeover):');
  const cornerCard = page.locator('#corner, .bmm-corner-widget').first();
  if (await cornerCard.isVisible()) {
    const claimBtn = cornerCard.locator('button:has-text("Claim"), button:has-text("Takeover"), button:has-text("Waitlist")').first();
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await page.waitForTimeout(400);

      const takeoverModal = page.locator('.bmm-modal-card, [role="dialog"]').first();
      const isVisible = await takeoverModal.isVisible();
      const modalText = await takeoverModal.innerText().catch(() => '');
      const hasSimulatedPayment = modalText.includes('Processing Razorpay') || modalText.includes('seconds');
      const hasSafeWaitlist = modalText.includes('Pricing Coming Soon') || modalText.includes('Waitlist');
      console.log('Corner Takeover Modal opened:', isVisible);
      console.log('Simulated payment found (Finding B):', hasSimulatedPayment);
      console.log('Safe preview waitlist copy found:', hasSafeWaitlist);

      await page.screenshot({ path: resolve(SCREENSHOT_DIR, '06_preview_corner_takeover.png') });

      const closeBtn = takeoverModal.locator('button:has-text("✕"), button[aria-label="Close"], button.bmm-modal-close').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  }

  // 6. Test On-Page Waitlist Form
  console.log('\n[STAGE 6] Testing On-Page Waitlist Form:');
  const waitlistSec = page.locator('#waitlist');
  const waitlistVisible = await waitlistSec.isVisible();
  console.log('Waitlist Section visible:', waitlistVisible);
  if (waitlistVisible) {
    const submitBtn = waitlistSec.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(200);
    const errorShown = await waitlistSec.locator('div:has-text("Please provide")').isVisible().catch(() => false);
    console.log('Empty submission correctly rejected:', errorShown);

    await waitlistSec.locator('input[name="brand_name"]').fill('Preview Auditor');
    await waitlistSec.locator('input[name="work_email"]').fill('auditor@vesper.ai');
    await waitlistSec.locator('input[name="website_url"]').fill('https://vesper.ai');
    await waitlistSec.locator('textarea[name="message"]').fill('Audited and verified in real browser');
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '07_preview_waitlist_form.png') });
    console.log('Valid waitlist test data filled successfully');
  }

  // 7. Viewport Responsiveness & Overflow Test
  console.log('\n[STAGE 7] Testing Viewports on Preview Deployment:');
  const viewports = [
    { name: 'desktop_1440x900', width: 1440, height: 900 },
    { name: 'laptop_1366x768', width: 1366, height: 768 },
    { name: 'tablet_768x1024', width: 768, height: 1024 },
    { name: 'mobile_390x844', width: 390, height: 844 },
    { name: 'narrow_320x700', width: 320, height: 700 },
  ];

  const vpResults = [];
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    const overflowInfo = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
      const innerWidth = window.innerWidth;
      return { scrollWidth, innerWidth, hasHorizontalScrollbar: scrollWidth > innerWidth };
    });

    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): innerWidth=${overflowInfo.innerWidth}, scrollWidth=${overflowInfo.scrollWidth}, overflow=${overflowInfo.hasHorizontalScrollbar}`);
    vpResults.push({ ...vp, ...overflowInfo, pass: !overflowInfo.hasHorizontalScrollbar });

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, `preview_vp_${vp.name}.png`),
      fullPage: false
    });
  }

  const finalSummary = {
    previewUrl: PREVIEW_URL,
    totalSpotsTested: spotResults.length,
    allSpotsPreviewSafe: spotResults.every(s => s.pricingComingSoon),
    hasLeakedPrice,
    viewports: vpResults,
    allViewportsZeroOverflow: vpResults.every(v => v.pass),
    consoleErrors: consoleLogs.filter(l => l.type === 'error'),
    networkErrors
  };

  writeFileSync(resolve(SCREENSHOT_DIR, 'preview_audit_summary.json'), JSON.stringify(finalSummary, null, 2));

  console.log('\n=== PREVIEW VERIFICATION AUDIT COMPLETE ===');
  console.log('Total spots tested:', spotResults.length);
  console.log('All spots preview safe:', finalSummary.allSpotsPreviewSafe);
  console.log('Leaked prices present:', hasLeakedPrice);
  console.log('All Viewports Zero Overflow:', finalSummary.allViewportsZeroOverflow);
  console.log('Console Errors:', finalSummary.consoleErrors.length);

  await browser.close();
}

verifyPreviewDeployment().catch(err => {
  console.error('Preview verification failed:', err);
  process.exit(1);
});
