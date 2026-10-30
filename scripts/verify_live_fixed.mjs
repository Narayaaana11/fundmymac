import { chromium } from 'playwright';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'https://fundmymac.vercel.app';

async function verifyLive() {
  console.log('Testing live production URL:', TARGET_URL);
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const hero = document.querySelector('.bmm-hero')?.innerText || '';
    const cornerEl = document.querySelector('.bmm-corner-desktop');
    const cornerVis = cornerEl ? window.getComputedStyle(cornerEl).display !== 'none' : false;
    const tickerEl = document.querySelector('.bmm-activity-ticker-card');
    const hasStaging = document.body ? document.body.innerText.includes('Staging Verification') : false;
    const hasCurrencySwitcher = (document.querySelector('.bmm-nav') ? document.querySelector('.bmm-nav').innerText : '').includes('₹');
    return {
      hero,
      cornerVis,
      tickerExists: tickerEl !== null,
      hasStaging,
      hasCurrencySwitcher
    };
  });

  console.log('--- Live Production Verification Results ---');
  console.log('0/20 spots taken present:', data.hero.includes('0/20 spots taken'));
  console.log('$4,000 goal present:', data.hero.includes('$4,000'));
  console.log('Currency switcher present:', data.hasCurrencySwitcher);
  console.log('Staging Verification present:', data.hasStaging);
  console.log('Corner desktop visible on 1366x768:', data.cornerVis);
  console.log('Activity ticker exists on live site:', data.tickerExists);

  await page.screenshot({ path: 'audit_screenshots/live_production_verified_1366.png' });
  console.log('Saved live screenshot: audit_screenshots/live_production_verified_1366.png');

  await browser.close();
}

verifyLive().catch(console.error);
