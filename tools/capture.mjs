// Captures real "before" screenshots of Kamino in a fresh headless Chrome profile.
// No wallet extension is loaded, nothing is signed, no credentials are entered.
import { chromium } from 'playwright-core';
import path from 'node:path';

const OUT = path.resolve('../research/before');
const MARKET = '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF'; // SOL/BTC (main) market
const pages = [
  ['earn-lend-overview', 'https://kamino.com/earn/lend'],
  ['borrow-markets-overview', 'https://kamino.com/borrow'],
  ['reserve-sol', `https://kamino.com/borrow/reserve/${MARKET}/d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q`],
  ['reserve-usdc', `https://kamino.com/borrow/reserve/${MARKET}/D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59`],
  ['multiply-list', 'https://kamino.com/multiply'],
  ['multiply-jitosol-sol', `https://kamino.com/multiply/${MARKET}/EVbyPKrHG6WBfm4dLxLMJpUDY43cCAcHSpV3KYjKsktW/d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q`],
  ['liquidity-list', 'https://kamino.com/liquidity'],
  ['liquidity-pyusd-usdc', 'https://kamino.com/liquidity/Hmj82e48X9LNW8LeMLk186iE4UKPoUwWuLwoiqMpUiGm'],
];
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [size, viewport] of Object.entries(sizes)) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile: size === 'mobile',
    hasTouch: size === 'mobile',
  });
  const page = await ctx.newPage();
  for (const [name, url] of pages) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    } catch { /* long-polling pages never go idle; fall through after timeout */ }
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/${name}-${size}.png`, fullPage: true });
    console.log('saved', name, size);

    // Supply / borrow modal: open only, to record what a wallet-less new user sees.
    if (name === 'reserve-sol' || name === 'borrow-markets-overview') {
      for (const label of ['Supply', 'Borrow']) {
        const btn = page.getByRole('button', { name: label, exact: true }).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click().catch(() => {});
          await page.waitForTimeout(2500);
          await page.screenshot({ path: `${OUT}/${name}-${label.toLowerCase()}-modal-${size}.png` });
          console.log('saved modal', name, label, size);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(800);
        }
      }
    }
  }
  await ctx.close();
}
await browser.close();
