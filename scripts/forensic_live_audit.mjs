import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const LIVE_URL = 'https://fundmymac.vercel.app';
const SCREENSHOT_DIR = resolve('audit_screenshots/live_audit');

if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runLiveAudit() {
  console.log('=== STARTING FUND MY MAC FORENSIC AUDIT ON LIVE WEBSITE ===');
  console.log('Target URL:', LIVE_URL);
  console.log('Browser:', CHROME_PATH);

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

  // --- STAGE 2: NAVIGATION & BASELINE ---
  console.log('\n[STAGE 2] Navigating to live site...');
  const response = await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
  console.log('Page response status:', response.status());
  console.log('Page title:', await page.title());

  await page.screenshot({ path: resolve(SCREENSHOT_DIR, '01_desktop_home_1440.png'), fullPage: true });

  // --- STAGE 3 & 4: TEST NAVIGATION, CURRENCY & CTAS ---
  console.log('\n[STAGE 4] Testing Currency Selector (INR, USD, EUR)...');
  const currencyAudit = [];
  const currencyBtns = await page.$$('.bmm-curr-btn');
  console.log(`Found ${currencyBtns.length} currency buttons`);

  for (const btn of currencyBtns) {
    const symbol = (await btn.innerText()).trim();
    await btn.click();
    await page.waitForTimeout(300);
    const activeClass = await btn.getAttribute('class');
    const heroPriceText = await page.locator('.bmm-btn-blue').first().innerText().catch(() => '');
    currencyAudit.push({ symbol, active: activeClass?.includes('active'), sampleText: heroPriceText });
    console.log(`Currency ${symbol} clicked: sampleText="${heroPriceText}", active=${activeClass?.includes('active')}`);
  }

  // Test Nav Anchor Links
  console.log('\nTesting Nav Anchor Links...');
  const navLinks = ['#spots', '#macbook-showcase', '#corner', '#vesper-mission', '#events', '#faq'];
  const navResults = [];
  for (const href of navLinks) {
    const link = page.locator(`a[href="${href}"]`).first();
    const count = await link.count();
    if (count > 0 && await link.isVisible()) {
      await link.click();
      await page.waitForTimeout(300);
      const targetExists = await page.locator(href).count() > 0;
      navResults.push({ href, found: true, targetSectionExists: targetExists });
      console.log(`Nav link ${href}: targetExists=${targetExists}`);
    } else {
      navResults.push({ href, found: false, targetSectionExists: false });
    }
  }

  // --- STAGE 5: MACBOOK VISUALIZER & 20 SPOTS ---
  console.log('\n[STAGE 5] Testing MacBook Visualizer (Lid/Inside, all spots)...');

  // Surface Switching
  const lidBtn = page.locator('button.bmm-pill-btn:has-text("Lid")').first();
  const insideBtn = page.locator('button.bmm-pill-btn:has-text("Inside")').first();

  await insideBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(SCREENSHOT_DIR, '02_macbook_inside.png') });
  console.log('Switched surface to Inside deck');

  await lidBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(SCREENSHOT_DIR, '03_macbook_lid.png') });
  console.log('Switched surface back to Lid');

  // Test Logo Tester Tool
  console.log('\nTesting Logo Tester Tool...');
  const logoTesterBtn = page.locator('.bmm-try-logo-pill-btn').first();
  let logoTesterOpened = false;
  if (await logoTesterBtn.isVisible()) {
    await logoTesterBtn.click();
    await page.waitForTimeout(400);
    logoTesterOpened = await page.locator('.bmm-logo-tester-bar').isVisible();
    console.log('Logo tester opened:', logoTesterOpened);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '04_logo_tester.png') });
    
    // Test selecting a sample logo
    const sampleLogoBtn = page.locator('button.tester-sample-chip').first();
    if (await sampleLogoBtn.count() > 0 && await sampleLogoBtn.isVisible()) {
      await sampleLogoBtn.click();
      await page.waitForTimeout(300);
      console.log('Selected sample logo chip');
    }

    // Close logo tester
    const closeTester = page.locator('button.tester-close-btn, button:has-text("✕")').first();
    if (await closeTester.count() > 0 && await closeTester.isVisible()) {
      await closeTester.click();
      await page.waitForTimeout(300);
    }
  }

  // Test all 20 spots in the Auction Grid / Inventory table
  console.log('\nTesting All 20 Sponsorship Spots...');
  const spotMatrix = [];

  // Scroll to spots section
  const spotsSection = page.locator('section.bmm-auction-section').first();
  if (await spotsSection.count() > 0) {
    await spotsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }

  // Find all bid buttons in the inventory table or cards
  const spotBidButtons = await page.$$('button:has-text("Bid"), button:has-text("Spot #"), button.bmm-btn-bid');
  console.log(`Discovered ${spotBidButtons.length} bid buttons in inventory table/list`);

  for (let id = 1; id <= 20; id++) {
    // Look for button or row for Spot #id
    const spotRow = page.locator(`tr:has-text("#${id} "), div:has-text("Spot #${id}"), tr:has-text("Spot #${id}")`).first();
    const count = await spotRow.count();
    
    if (count > 0) {
      const rowText = (await spotRow.innerText()).replace(/\n/g, ' | ');
      const bidBtn = spotRow.locator('button').first();
      let modalOpened = false;
      let modalTitle = '';

      if (await bidBtn.count() > 0 && await bidBtn.isVisible()) {
        await bidBtn.click();
        await page.waitForTimeout(400);

        const modal = page.locator('.bmm-modal-card');
        if (await modal.isVisible()) {
          modalOpened = true;
          modalTitle = await page.locator('.bmm-modal-title').innerText().catch(() => '');
          
          // Verify close button
          const closeBtn = page.locator('.bmm-modal-close');
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(300);
          }
        }
      }

      spotMatrix.push({
        id,
        found: true,
        rowText,
        modalOpened,
        modalTitle,
        status: modalOpened ? 'PASS' : 'FAIL'
      });
      console.log(`Spot #${id}: PASS (Modal title: "${modalTitle}")`);
    } else {
      spotMatrix.push({
        id,
        found: false,
        status: 'FAIL',
        error: 'Spot not found in inventory view'
      });
      console.log(`Spot #${id}: NOT FOUND in DOM`);
    }
  }

  // --- STAGE 6: MODALS & FORMS AUDIT ---
  console.log('\n[STAGE 6] Testing Modals & Form Submission Handling...');

  // 1. Leaderboard Modal
  const lbBtn = page.locator('.bmm-nav-leaderboard-btn, button:has-text("View Leaderboard")').first();
  let lbModalWorks = false;
  if (await lbBtn.isVisible()) {
    await lbBtn.click();
    await page.waitForTimeout(400);
    const lbModal = page.locator('.bmm-modal-card:has-text("LEADERBOARD"), .bmm-modal-card:has-text("Leaderboard")');
    lbModalWorks = await lbModal.isVisible();
    console.log('Leaderboard modal opened:', lbModalWorks);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '05_leaderboard_modal.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // 2. Corner Takeover Modal
  const cornerClaimBtn = page.locator('.bmm-corner-widget button, button:has-text("Claim Corner"), button:has-text("Claim —")').first();
  let cornerModalWorks = false;
  if (await cornerClaimBtn.count() > 0 && await cornerClaimBtn.isVisible()) {
    await cornerClaimBtn.click();
    await page.waitForTimeout(400);
    const cornerModal = page.locator('.bmm-modal-card:has-text("CORNER"), .bmm-modal-card:has-text("Corner")');
    cornerModalWorks = await cornerModal.isVisible();
    console.log('Corner takeover modal opened:', cornerModalWorks);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '06_corner_takeover_modal.png') });

    // Inspect if Corner modal has simulated takeover
    const takeoverBtn = page.locator('button:has-text("Take The Corner")');
    console.log('Corner modal submit button found:', await takeoverBtn.count() > 0);

    const closeBtn = page.locator('.bmm-modal-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // 3. Enquiry / Waitlist Form Audit
  console.log('\nAuditing Enquiry / Waitlist form...');
  const formLocator = page.locator('form:has(input[type="email"]), #enquiry-form, #waitlist-form');
  const formCount = await formLocator.count();
  console.log(`Found ${formCount} enquiry/waitlist forms`);

  if (formCount > 0) {
    const form = formLocator.first();
    await form.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '07_enquiry_form.png') });

    // Test empty submission
    const submitBtn = form.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(300);
      console.log('Tested empty submission on enquiry form');
    }
  }

  // 4. FAQ Accordion audit
  console.log('\nAuditing FAQ Accordion...');
  const faqItems = await page.$$('.bmm-faq-item, details, .faq-accordion');
  console.log(`Found ${faqItems.length} FAQ items`);
  for (let i = 0; i < Math.min(faqItems.length, 3); i++) {
    const item = faqItems[i];
    await item.click();
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: resolve(SCREENSHOT_DIR, '08_faq_open.png') });

  // --- STAGE 7: VIEWPORT RESPONSIVENESS AUDIT ---
  console.log('\n[STAGE 7] Auditing Viewports (1440x900, 1366x768, 768x1024, 390x844, 320x700)...');
  const viewports = [
    { name: 'desktop_1440x900', width: 1440, height: 900 },
    { name: 'laptop_1366x768', width: 1366, height: 768 },
    { name: 'tablet_768x1024', width: 768, height: 1024 },
    { name: 'mobile_390x844', width: 390, height: 844 },
    { name: 'narrow_320x700', width: 320, height: 700 }
  ];

  const viewportResults = [];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(600);

    const metrics = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      const hasHorizontalOverflow = scrollWidth > innerWidth + 1;
      return {
        scrollWidth,
        innerWidth,
        hasHorizontalOverflow
      };
    });

    console.log(`Viewport ${vp.name}: width=${vp.width}, scrollWidth=${metrics.scrollWidth}, hasOverflow=${metrics.hasHorizontalOverflow}`);
    
    // In mobile viewports, check mobile hamburger menu
    if (vp.width <= 768) {
      const hamburger = page.locator('.bmm-nav-hamburger');
      const hamburgerVisible = await hamburger.isVisible();
      console.log(`Hamburger menu visible at ${vp.width}px:`, hamburgerVisible);
      if (hamburgerVisible) {
        await hamburger.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: resolve(SCREENSHOT_DIR, `vp_${vp.name}_drawer_open.png`) });
        await hamburger.click(); // Close
        await page.waitForTimeout(300);
      }
    }

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, `vp_${vp.name}.png`),
      fullPage: false
    });

    viewportResults.push({
      ...vp,
      ...metrics
    });
  }

  await browser.close();

  const auditReport = {
    timestamp: new Date().toISOString(),
    liveUrl: LIVE_URL,
    consoleLogs,
    networkErrors,
    currencyAudit,
    navResults,
    spotMatrix,
    viewportResults
  };

  writeFileSync(resolve(SCREENSHOT_DIR, 'audit_data.json'), JSON.stringify(auditReport, null, 2));
  console.log('\n=== LIVE FORENSIC AUDIT COMPLETE ===');
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log(`Spot audit count: ${spotMatrix.length} spots checked`);
  console.log(`Console errors: ${consoleLogs.filter(l => l.type === 'error').length}`);
  console.log(`Network errors: ${networkErrors.length}`);
}

runLiveAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
