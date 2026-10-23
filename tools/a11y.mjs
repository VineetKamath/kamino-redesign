// axe-core WCAG 2.1 A/AA audit of every route × review state, desktop + mobile.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const axeSrc = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const ROUTES = ['/', '/system', '/borrow', '/what-if', '/multiply', '/discover', '/position'];
const STATES = ['default', 'interacting', 'warning', 'danger', 'success', 'loading', 'empty'];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const found = new Map(); // id → { impact, help, targets:Set, pages:Set }

for (const [size, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  for (const route of ROUTES) {
    const states = route === '/' || route === '/system' ? ['default'] : STATES;
    for (const st of states) {
      await page.goto(`http://localhost:5173${route}${st === 'default' ? '' : `?state=${st}`}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await page.addScriptTag({ content: axeSrc });
      const res = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations);
      for (const v of res) {
        const e = found.get(v.id) ?? { impact: v.impact, help: v.help, targets: new Set(), pages: new Set(), sample: v.nodes[0]?.failureSummary };
        v.nodes.forEach((n) => e.targets.add(n.target.join(' ')));
        e.pages.add(`${size}${route}?${st}`);
        found.set(v.id, e);
      }
    }
  }
  await page.close();
}
await browser.close();
if (!found.size) console.log('axe: 0 violations');
for (const [id, e] of found) {
  console.log(`\n[${e.impact}] ${id}: ${e.help} — ${e.pages.size} page(s)`);
  console.log('  e.g.', [...e.pages].slice(0, 3).join(', '));
  console.log('  targets:', [...e.targets].slice(0, 6).join(' | '));
  console.log('  ', (e.sample || '').split('\n').slice(0, 3).join(' / '));
}
