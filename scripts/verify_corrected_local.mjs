import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'http://localhost:4173';
const SCREENSHOT_DIR = resolve('audit_screenshots/corrected_audit');

if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runCorrectedAudit() {
  console.log('=== STARTING AUDIT ON CORRECTED BUILD ===');
  console.log('Target URL:', TARGET_URL);

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
      console.log(`[BROWSER CONSOLE ERROR] ${text}`);
    }
  });

  page.on('requestfailed', req => {
    const err = req.failure()?.errorText || 'Unknown failure';
    networkErrors.push({ url: req.url(), error: err });
    console.log(`[NETWORK FAILED] ${req.url()} - ${err}`);
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      networkErrors.push({ url: res.url(), status: res.status() });
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  console.log('\n[STAGE 2 & 3] Navigating to corrected build...');
  const response = await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
  console.log('Page response status:', response.status());
  console.log('Page title:', await page.title());

  await page.screenshot({ path: resolve(SCREENSHOT_DIR, '01_corrected_desktop_home.png'), fullPage: true });

  // 1. Verify Public Preview restrictions
  console.log('\n[STAGE 8] Verifying Public Preview Status...');
  const pageText = await page.locator('body').innerText();
  const hasPreviewNotice = pageText.includes('Public Preview') || pageText.includes('Coming Soon');
  const hasLeakedPrice = /\$430|\$135|\$45/.test(pageText);
  console.log('Public Preview notice present:', hasPreviewNotice);
  console.log('Leaked prices ($430, $135, $45) present:', hasLeakedPrice);

  // 2. Test Navigation Links & CTA
  console.log('\n[STAGE 4] Testing Navigation Links & CTAs...');
  const navLinks = ['#waitlist', '#macbook-controls', '#corner', '#vesper-mission', '#events', '#faq'];
  const navResults = [];
  for (const href of navLinks) {
    const link = page.locator(`a[href="${href}"]`).first();
    const count = await link.count();
    let targetExists = false;
    if (count > 0 && await link.isVisible()) {
      await link.click();
      await page.waitForTimeout(200);
      targetExists = await page.locator(href).count() > 0;
      navResults.push({ href, found: true, targetSectionExists: targetExists });
    } else {
      targetExists = await page.locator(href).count() > 0;
      navResults.push({ href, found: false, targetSectionExists: targetExists });
    }
    console.log(`Nav link ${href}: found=${count > 0}, targetExists=${targetExists}`);
  }

  // 3. Test MacBook Visualizer (Surface Switch & All 20 Spots)
  console.log('\n[STAGE 5] Testing MacBook Visualizer...');
  const lidBtn = page.locator('button.bmm-pill-btn:has-text("Lid")').first();
  const insideBtn = page.locator('button.bmm-pill-btn:has-text("Inside")').first();

  await lidBtn.click();
  await page.waitForTimeout(300);
  const lidSpots = await page.$$('.bmm-lid-grid .bmm-spot-box');
  console.log(`Lid surface active. Spot count: ${lidSpots.length}`);

  const spotMatrix = [];

  // Test Lid spots (Spots 1-10)
  for (let i = 0; i < lidSpots.length; i++) {
    const pin = lidSpots[i];
    const spotId = await pin.getAttribute('data-spot-id');
    const spotText = (await pin.innerText()).trim();
    await pin.hover();
    await page.waitForTimeout(100);
    const tooltip = await pin.getAttribute('title');
    await pin.click();
    await page.waitForTimeout(300);

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
        await page.waitForTimeout(200);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    }
    spotMatrix.push({
      spotId: Number(spotId) || (i + 1),
      surface: 'lid',
      label: spotText,
      tooltip: tooltip || 'none',
      modalOpened: modalVisible,
      modalTitle,
      pricingComingSoon: hasPricingComingSoon
    });
    console.log(`Lid Spot ${spotId || (i + 1)} (${spotText}): modal=${modalVisible}, title="${modalTitle}", previewSafe=${hasPricingComingSoon}`);
  }

  // Switch to Inside
  await insideBtn.click();
  await page.waitForTimeout(300);
  const insideSpots = await page.$$('.bmm-inside-chassis .bmm-inside-spot');
  console.log(`Inside surface active. Spot count: ${insideSpots.length}`);

  // Test Inside spots (Spots 11-18)
  for (let i = 0; i < insideSpots.length; i++) {
    const pin = insideSpots[i];
    const spotId = await pin.getAttribute('data-spot-id');
    const spotText = (await pin.innerText()).trim();
    await pin.hover();
    await page.waitForTimeout(100);
    const tooltip = await pin.getAttribute('title');
    await pin.click();
    await page.waitForTimeout(300);

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
        await page.waitForTimeout(200);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    }
    spotMatrix.push({
      spotId: Number(spotId) || (i + 11),
      surface: 'inside',
      label: spotText,
      tooltip: tooltip || 'none',
      modalOpened: modalVisible,
      modalTitle,
      pricingComingSoon: hasPricingComingSoon
    });
    console.log(`Inside Spot ${spotId || (i + 11)} (${spotText}): modal=${modalVisible}, title="${modalTitle}", previewSafe=${hasPricingComingSoon}`);
  }

  // Test Accessories: Charger (Spot 19) and Mouse (Spot 20)
  const chargerSpotEl = page.locator('.bmm-charger-side .bmm-spot-box').first();
  if (await chargerSpotEl.isVisible()) {
    await chargerSpotEl.click();
    await page.waitForTimeout(300);
    const modal = page.locator('.bmm-modal-card, [role="dialog"]').first();
    const modalVisible = await modal.isVisible().catch(() => false);
    let hasPricingComingSoon = false;
    let modalTitle = '';
    if (modalVisible) {
      modalTitle = (await modal.locator('h3, h2').first().innerText().catch(() => '')).trim();
      const modalText = await modal.innerText().catch(() => '');
      hasPricingComingSoon = modalText.includes('Pricing Coming Soon') || modalText.includes('Waitlist');
      const closeBtn = modal.locator('button:has-text("✕"), button[aria-label="Close"], button.bmm-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(200);
      }
    }
    spotMatrix.push({
      spotId: 19,
      surface: 'accessory',
      label: 'Charger',
      tooltip: 'Charger Spot 19',
      modalOpened: modalVisible,
      modalTitle,
      pricingComingSoon: hasPricingComingSoon
    });
    console.log(`Accessory Spot 19 (Charger): modal=${modalVisible}, previewSafe=${hasPricingComingSoon}`);
  }

  const mouseSpotEl = page.locator('.bmm-mouse-side .bmm-spot-box').first();
  if (await mouseSpotEl.isVisible()) {
    await mouseSpotEl.click();
    await page.waitForTimeout(300);
    const modal = page.locator('.bmm-modal-card, [role="dialog"]').first();
    const modalVisible = await modal.isVisible().catch(() => false);
    let hasPricingComingSoon = false;
    let modalTitle = '';
    if (modalVisible) {
      modalTitle = (await modal.locator('h3, h2').first().innerText().catch(() => '')).trim();
      const modalText = await modal.innerText().catch(() => '');
      hasPricingComingSoon = modalText.includes('Pricing Coming Soon') || modalText.includes('Waitlist');
      const closeBtn = modal.locator('button:has-text("✕"), button[aria-label="Close"], button.bmm-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(200);
      }
    }
    spotMatrix.push({
      spotId: 20,
      surface: 'accessory',
      label: 'Magic Mouse',
      tooltip: 'Magic Mouse Spot 20',
      modalOpened: modalVisible,
      modalTitle,
      pricingComingSoon: hasPricingComingSoon
    });
    console.log(`Accessory Spot 20 (Magic Mouse): modal=${modalVisible}, previewSafe=${hasPricingComingSoon}`);
  }

  // Test Logo Testing Tool
  console.log('\n[STAGE 5] Testing Logo Tester...');
  const testLogoBtn = page.locator('button:has-text("Test Logo")').first();
  if (await testLogoBtn.isVisible()) {
    await testLogoBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '04_corrected_logo_tester.png') });

    // Test clicking sample logo
    const sampleBtn = page.locator('.bmm-sample-logo-btn, button:has-text("Brand A")').first();
    if (await sampleBtn.isVisible()) {
      await sampleBtn.click();
      await page.waitForTimeout(300);
      console.log('Sample logo clicked successfully');
    }

    // Close logo tester
    const closeTester = page.locator('button:has-text("✕"), button:has-text("Done"), button:has-text("Close")').first();
    if (await closeTester.isVisible()) {
      await closeTester.click();
      await page.waitForTimeout(200);
    }
  }

  // Test Corner Takeover Modal (Finding B Verification)
  console.log('\n[STAGE 6 & 8] Testing Corner Takeover Modal (Finding B)...');
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
      console.log('Simulated payment found:', hasSimulatedPayment);
      console.log('Safe preview waitlist copy found:', hasSafeWaitlist);

      await page.screenshot({ path: resolve(SCREENSHOT_DIR, '06_corrected_corner_takeover.png') });

      const closeBtn = takeoverModal.locator('button:has-text("✕"), button[aria-label="Close"], button.bmm-modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(200);
      }
    }
  }

  // Test Waitlist Section
  console.log('\n[STAGE 6] Testing On-Page Waitlist Section...');
  const waitlistSec = page.locator('#waitlist');
  const waitlistVisible = await waitlistSec.isVisible();
  console.log('Waitlist Section visible:', waitlistVisible);

  if (waitlistVisible) {
    const submitBtn = waitlistSec.locator('button[type="submit"]');
    // Test empty submit
    await submitBtn.click();
    await page.waitForTimeout(200);
    console.log('Tested empty submission on waitlist form');

    // Fill valid data
    await waitlistSec.locator('input[name="brand_name"]').fill('Jane Doe');
    await waitlistSec.locator('input[name="work_email"]').fill('jane@example.com');
    await waitlistSec.locator('input[name="website_url"]').fill('https://example.com');
    await waitlistSec.locator('textarea[name="message"]').fill('Interested in Corner Spot #1');
    console.log('Filled valid test data in waitlist form');
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '07_corrected_waitlist_form.png') });
  }

  // FAQ Accordion
  console.log('\n[STAGE 4] Testing FAQ Accordions...');
  const faqItems = await page.$$('.bmm-faq-question, details summary, button:has-text("What happens")');
  console.log(`Found ${faqItems.length} FAQ accordion triggers`);
  if (faqItems.length > 0) {
    await faqItems[0].click();
    await page.waitForTimeout(200);
  }

  // Viewport Responsiveness & Overflow Test
  console.log('\n[STAGE 7] Testing Viewports for Horizontal Overflow...');
  const viewports = [
    { name: 'desktop_1440x900', width: 1440, height: 900 },
    { name: 'laptop_1366x768', width: 1366, height: 768 },
    { name: 'tablet_768x1024', width: 768, height: 1024 },
    { name: 'mobile_390x844', width: 390, height: 844 },
    { name: 'narrow_320x700', width: 320, height: 700 },
  ];

  const viewportResults = [];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    const overflowInfo = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
      const clientWidth = docEl.clientWidth;
      const innerWidth = window.innerWidth;
      const hasHorizontalScrollbar = scrollWidth > innerWidth;
      return { scrollWidth, clientWidth, innerWidth, hasHorizontalScrollbar };
    });

    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): innerWidth=${overflowInfo.innerWidth}, scrollWidth=${overflowInfo.scrollWidth}, overflow=${overflowInfo.hasHorizontalScrollbar}`);

    viewportResults.push({
      ...vp,
      ...overflowInfo,
      pass: !overflowInfo.hasHorizontalScrollbar
    });

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, `vp_${vp.name}.png`),
      fullPage: false
    });
  }

  // Final Summary
  const auditSummary = {
    url: TARGET_URL,
    totalSpotsTested: spotMatrix.length,
    allSpotsPreviewSafe: spotMatrix.every(s => s.pricingComingSoon),
    hasLeakedPrice,
    viewports: viewportResults,
    consoleErrors: consoleLogs.filter(l => l.type === 'error'),
    networkErrors
  };

  writeFileSync(resolve(SCREENSHOT_DIR, 'corrected_audit_summary.json'), JSON.stringify(auditSummary, null, 2));

  console.log('\n=== CORRECTED AUDIT COMPLETE ===');
  console.log('Total spots tested:', spotMatrix.length);
  console.log('All spots preview safe (Pricing Coming Soon):', auditSummary.allSpotsPreviewSafe);
  console.log('Console Errors:', auditSummary.consoleErrors.length);
  console.log('Network Errors:', auditSummary.networkErrors.length);
  console.log('All Viewports Zero Overflow:', viewportResults.every(v => v.pass));

  await browser.close();
}

runCorrectedAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
