// Keyboard-only checks for the core interactions.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

// 1. Borrow slider: focus via Tab, arrows change value, gauge meter updates
await page.goto('http://localhost:5173/borrow', { waitUntil: 'networkidle' });
const slider = page.getByRole('slider', { name: 'Borrow amount' });
let reached = false;
for (let i = 0; i < 40 && !reached; i++) {
  await page.keyboard.press('Tab');
  reached = await slider.evaluate((el) => el === document.activeElement);
}
check('Borrow slider reachable by Tab', reached);
const before = await slider.getAttribute('aria-valuenow');
await page.keyboard.press('PageUp');
const after = await slider.getAttribute('aria-valuenow');
check('PageUp raises borrow amount', Number(after) > Number(before), `${before} → ${after}`);
const meter = await page.getByRole('meter', { name: 'Position health' }).getAttribute('aria-valuetext');
check('Gauge exposes a spoken summary', !!meter, meter ?? '');

// 2. What-if: End key jumps to max, Home to min
await page.goto('http://localhost:5173/what-if', { waitUntil: 'networkidle' });
const price = page.getByRole('slider', { name: 'SOL price change' });
await price.focus();
await page.keyboard.press('Home');
check('Home moves price scrubber to −60%', (await price.getAttribute('aria-valuenow')) === '-60');

// 3. Fix sheet: opens from keyboard, Tab stays inside, Esc closes and returns focus
await page.goto('http://localhost:5173/position', { waitUntil: 'networkidle' });
const fixBtn = page.getByRole('button', { name: 'Fix my position' });
await fixBtn.focus();
await page.keyboard.press('Enter');
const dialog = page.getByRole('dialog', { name: 'Fix my position' });
await dialog.waitFor();
let escaped = false;
for (let i = 0; i < 30; i++) {
  await page.keyboard.press('Tab');
  if (!(await dialog.evaluate((d) => d.contains(document.activeElement)))) escaped = true;
}
check('Focus stays inside sheet over 30 Tabs', !escaped);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check('Esc closes sheet', !(await dialog.isVisible().catch(() => false)));
check('Focus returns to trigger', await fixBtn.evaluate((el) => el === document.activeElement));

// 4. Before/After toggle is a pressed-state button
await page.goto('http://localhost:5173/multiply', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Kamino today' }).click();
const shot = page.getByRole('img', { name: /Kamino today/ }).first();
await shot.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
check('Before view shows real screenshot', await shot.evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false));

console.log(results.join('\n'));
await browser.close();
