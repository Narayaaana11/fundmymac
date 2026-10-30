import { chromium } from 'playwright';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'http://localhost:5173';

async function verifyDetailed() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  const heroText = await page.evaluate(() => {
    return document.querySelector('.bmm-hero')?.innerText || '';
  });

  console.log('--- Hero Text Check ---');
  console.log('Includes "$0 raised":', heroText.includes('$0 raised') || heroText.includes('$0\nraised'));
  console.log('Includes "0/20 spots taken":', heroText.includes('0/20 spots taken'));
  console.log('Includes "$4,000":', heroText.includes('$4,000'));
  console.log('Snippet around raised/goal:');
  const lines = heroText.split('\n').filter(l => l.includes('$') || l.includes('spots') || l.includes('goal') || l.includes('Milestone'));
  console.log(lines.join(' | '));

  await page.screenshot({ path: 'audit_screenshots/ui_fixed_laptop_1366.png' });

  await browser.close();
}

verifyDetailed().catch(console.error);
