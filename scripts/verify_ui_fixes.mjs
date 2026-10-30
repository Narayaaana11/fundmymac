import { chromium } from 'playwright';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'http://localhost:5173';

async function verify() {
  console.log('Testing local server at:', TARGET_URL);
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true
  });

  const viewports = [
    { name: 'desktop_1440', width: 1440, height: 900 },
    { name: 'laptop_1366', width: 1366, height: 768 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'mobile_390', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const vpWidth = vp.width;
    const hasHorizontalOverflow = docWidth > vpWidth;

    // Check if .bmm-corner-desktop is visible
    const cornerDesktopVisible = await page.evaluate(() => {
      const el = document.querySelector('.bmm-corner-desktop');
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });

    // Check if LiveActivityTicker exists
    const tickerExists = await page.evaluate(() => {
      return document.querySelector('.bmm-activity-ticker-card') !== null;
    });

    // Check currency switcher
    const hasCurrencySwitcher = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('₹') || text.includes('€');
    });

    // Check metrics
    const statsText = await page.evaluate(() => {
      return document.body.innerText;
    });

    const hasStagingArtifact = statsText.includes('Staging Verification');

    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}):`);
    console.log(`  - Horizontal Overflow: ${hasHorizontalOverflow ? 'FAIL (' + docWidth + ' > ' + vpWidth + ')' : 'PASS (0 overflow)'}`);
    console.log(`  - Corner Desktop Visible: ${cornerDesktopVisible} (Should be false on <=1540px)`);
    console.log(`  - Live Ticker Popup Exists: ${tickerExists} (Should be false)`);
    console.log(`  - Has ₹ or € currency symbols: ${hasCurrencySwitcher} (Should be false)`);
    console.log(`  - Has "Staging Verification" text: ${hasStagingArtifact} (Should be false)`);

    await page.close();
  }

  await browser.close();
  console.log('Verification completed.');
}

verify().catch(console.error);
