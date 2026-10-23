// Every feature × every review state × desktop/mobile. Usage: node shoot-states.mjs <outDir> [route...]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const [outDir, ...only] = process.argv.slice(2);
const ROUTES = only.length ? only : ['/borrow', '/what-if', '/multiply', '/discover', '/position'];
const EXTRA = only.length ? [] : ['/', '/system'];
// Full-page shots capture fixed elements once, mid-page. Render the mobile tab bar in flow at the bottom instead.
const FLOW_NAV = 'nav.fixed{position:static!important}';
const STATES = ['default', 'interacting', 'warning', 'danger', 'success', 'loading', 'empty'];
const SIZES = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];
for (const [size, viewport] of Object.entries(SIZES)) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: size === 'mobile', hasTouch: size === 'mobile', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`${size} ${page.url()} ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && problems.push(`${size} ${page.url()} ${m.text()}`));
  for (const route of ROUTES) {
    for (const st of STATES) {
      await page.goto(`http://localhost:5173${route}${st === 'default' ? '' : `?state=${st}`}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: FLOW_NAV });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const name = `${route.slice(1)}-${st}-${size}.png`;
      await page.screenshot({ path: `${outDir}/${name}`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 0) problems.push(`${name}: horizontal overflow ${overflow}px`);
    }
    // Before view (real screenshot)
    await page.goto(`http://localhost:5173${route}?view=before`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: FLOW_NAV });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${outDir}/${route.slice(1)}-before-${size}.png`, fullPage: true });
  }
  for (const route of EXTRA) {
    await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: FLOW_NAV });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${outDir}/${route === '/' ? 'home' : 'system'}-${size}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'no errors, no overflow');
