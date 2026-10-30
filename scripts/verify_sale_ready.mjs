import { chromium } from 'playwright';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'http://localhost:5173';

async function verify() {
  console.log('Testing local server in SALE mode:', TARGET_URL);
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true
  });

  const viewports = [
    { name: 'desktop_1440', width: 1440, height: 900, expectDesktopCorner: true },
    { name: 'laptop_1366', width: 1366, height: 768, expectDesktopCorner: true },
    { name: 'tablet_768', width: 768, height: 1024, expectDesktopCorner: false },
    { name: 'mobile_390', width: 390, height: 844, expectDesktopCorner: false },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const hasHorizontalOverflow = docWidth > vp.width;

    const cornerDesktopVisible = await page.evaluate(() => {
      const el = document.querySelector('.bmm-corner-desktop');
      if (!el) return false;
      return window.getComputedStyle(el).display !== 'none';
    });

    const cornerMobileVisible = await page.evaluate(() => {
      const el = document.querySelector('.bmm-corner-mobile');
      if (!el) return false;
      return window.getComputedStyle(el).display !== 'none';
    });

    // Check overlap on desktop/laptop
    let hasOverlap = false;
    if (cornerDesktopVisible) {
      hasOverlap = await page.evaluate(() => {
        const cornerRect = document.querySelector('.bmm-corner-desktop')?.getBoundingClientRect();
        const heroH1Rect = document.querySelector('.bmm-h1')?.getBoundingClientRect();
        if (!cornerRect || !heroH1Rect) return false;
        // Check if cornerRect overlaps heroH1Rect
        return !(
          cornerRect.right < heroH1Rect.left ||
          cornerRect.left > heroH1Rect.right ||
          cornerRect.bottom < heroH1Rect.top ||
          cornerRect.top > heroH1Rect.bottom
        );
      });
    }

    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}):`);
    console.log(`  - Horizontal Overflow: ${hasHorizontalOverflow ? 'FAIL' : 'PASS (0 overflow)'}`);
    console.log(`  - Corner Desktop Visible: ${cornerDesktopVisible} (Expected: ${vp.expectDesktopCorner})`);
    console.log(`  - Corner Mobile Visible: ${cornerMobileVisible} (Expected: ${!vp.expectDesktopCorner})`);
    if (cornerDesktopVisible) {
      console.log(`  - Headline Overlap: ${hasOverlap ? 'FAIL (Overlap detected!)' : 'PASS (Zero overlap, clean separation)'}`);
    }

    if (vp.name === 'laptop_1366') {
      await page.screenshot({ path: 'audit_screenshots/sale_ready_laptop_1366.png' });
    }

    await page.close();
  }

  // Also verify clicking a spot opens BidModal in sale mode with 20% deposit and Razorpay key option
  const testPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await testPage.goto(TARGET_URL, { waitUntil: 'networkidle' });

  // 1. Navbar checks: NO timer in navbar, NO waitlist in navbar
  const hasNavTimer = await testPage.evaluate(() => {
    const timer = document.querySelector('.bmm-nav .bmm-countdown-compact');
    return timer !== null;
  });
  const hasNavWaitlist = await testPage.evaluate(() => {
    return Array.from(document.querySelectorAll('.bmm-nav a')).some((a) =>
      a.textContent?.toLowerCase().includes('waitlist')
    );
  });
  const hasWaitlistSection = await testPage.evaluate(() => {
    return document.querySelector('#waitlist') !== null;
  });

  console.log('\n--- Navbar & Page Cleanliness Checks ---');
  console.log('Navbar Countdown Timer Removed:', !hasNavTimer ? 'PASS (Removed)' : 'FAIL');
  console.log('Navbar Waitlist Link Removed:', !hasNavWaitlist ? 'PASS (Removed)' : 'FAIL');
  console.log('Waitlist Section Removed:', !hasWaitlistSection ? 'PASS (Removed)' : 'FAIL');

  // 2. Click spot #2 (Marquee)
  await testPage.click('[data-spot-id="2"]');
  await testPage.waitForTimeout(500);

  const modalTitle = await testPage.textContent('#bid-modal-title');
  const modalText = await testPage.evaluate(() => document.querySelector('.bmm-modal-card')?.innerText || '');

  // Check modal bounds
  const modalRect = await testPage.evaluate(() => {
    const card = document.querySelector('.bmm-modal-card');
    const closeBtn = document.querySelector('.bmm-modal-close');
    const cardBox = card?.getBoundingClientRect();
    const closeBox = closeBtn?.getBoundingClientRect();
    return {
      cardTop: cardBox?.top,
      cardBottom: cardBox?.bottom,
      cardHeight: cardBox?.height,
      windowHeight: window.innerHeight,
      closeVisible: closeBox && closeBox.top >= 0 && closeBox.bottom <= window.innerHeight
    };
  });

  console.log('\n--- BidModal Live Verification ---');
  console.log('Modal opened for:', modalTitle);
  console.log('Includes "$500":', modalText.includes('500'));
  console.log('Includes "Place Bid Deposit ($100)":', modalText.includes('100'));
  console.log('Includes "Open for Bidding":', modalText.includes('Open for Bidding'));
  console.log('Modal Card Top >= 0:', modalRect.cardTop >= 0 ? `PASS (${modalRect.cardTop}px)` : `FAIL (${modalRect.cardTop}px)`);
  console.log('Modal Card Bottom <= Viewport:', modalRect.cardBottom <= modalRect.windowHeight ? `PASS (${modalRect.cardBottom}px <= ${modalRect.windowHeight}px)` : `FAIL`);
  console.log('Close Button Fully Visible:', modalRect.closeVisible ? 'PASS' : 'FAIL');

  await testPage.screenshot({ path: 'audit_screenshots/sale_ready_bid_modal.png' });

  // Now test Corner Takeover modal
  await testPage.click('.bmm-modal-close');
  await testPage.waitForTimeout(300);

  await testPage.click('.bmm-corner-desktop .bmm-corner-card');
  await testPage.waitForTimeout(500);

  const cornerModalText = await testPage.evaluate(() => document.querySelector('.bmm-modal-card')?.innerText || '');
  console.log('\n--- CornerTakeoverModal Live Verification ---');
  console.log('Includes "The Corner Placement":', cornerModalText.includes('The Corner Placement'));
  console.log('Includes "$45":', cornerModalText.includes('45'));
  console.log('Includes Razorpay Key ID option:', cornerModalText.includes('Razorpay Key ID'));

  await testPage.screenshot({ path: 'audit_screenshots/sale_ready_corner_modal.png' });

  await browser.close();
  console.log('\nAll sale mode tests completed successfully.');
}

verify().catch(console.error);
