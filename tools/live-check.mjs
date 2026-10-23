// Real-browser check of the deployed site: footer present, no console errors, no horizontal overflow.
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'https://kamino-redesign-six.vercel.app';
const ROUTES = ['/', '/borrow', '/what-if', '/multiply', '/discover', '/position', '/system', '/borrow?view=before', '/position?state=interacting'];
const FOOT = 'Concept redesign by Vineet Kamath — not affiliated with Kamino. Mock data, no wallet connection.';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];
let checked = 0;
for (const [size, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, isMobile: size === 'mobile', hasTouch: size === 'mobile' });
  page.on('console', (m) => m.type() === 'error' && problems.push(`${size} ${page.url()} console: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`${size} ${page.url()} error: ${e.message}`));
  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: 'networkidle' });
    const foot = await page.locator('footer').innerText().catch(() => '');
    if (!foot.includes(FOOT)) problems.push(`${size} ${r}: footer missing`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`${size} ${r}: horizontal overflow ${overflow}px`);
    checked++;
  }
  await page.close();
}
await browser.close();
console.log(`${checked} page loads checked`);
console.log(problems.length ? problems.join('\n') : 'no console errors, footer everywhere, no overflow');
