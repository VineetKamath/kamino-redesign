// Converts rendered prototype screens into structured SVG for Figma import as editable layers
// (SVG <text> → Figma TEXT, <g id> → named groups, <rect>/<path> → vectors).
// Usage: node dom2svg.mjs [route...]   (dev server on :5173)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('../figma-export/svg');
fs.mkdirSync(OUT, { recursive: true });
const STATES = ['default', 'interacting', 'warning', 'danger', 'success', 'loading', 'empty'];
const FEATURES = {
  '/borrow': { n: 1, name: 'Borrow', calloutState: 'default', callouts: [
    (p) => p.getByRole('meter').first(),
    (p) => p.locator('figcaption').first(),
    (p) => p.getByText('1 · Collateral'),
    (p) => p.getByRole('slider', { name: 'Borrow amount' }).locator('..'),
    (p) => p.getByRole('button', { name: /Max safe/ }),
    (p) => p.getByText('Liquidation price').first(),
  ] },
  '/what-if': { n: 2, name: 'What-if', calloutState: 'danger', callouts: [
    (p) => p.getByRole('slider', { name: 'SOL price change' }).locator('..'),
    (p) => p.getByRole('button', { name: /Replay/ }),
    (p) => p.getByRole('meter').first(),
    (p) => p.getByText('Kamino sells a slice, not everything'),
    (p) => p.getByRole('button', { name: 'See ways to avoid this' }),
  ] },
  '/multiply': { n: 3, name: 'Multiply', calloutState: 'default', callouts: [
    (p) => p.getByRole('group', { name: 'Strategy' }),
    (p) => p.getByText('Exposure').first().locator('..'),
    (p) => p.getByText('Break-even rate'),
    (p) => p.locator('svg[role=img]').first(),
    (p) => p.getByRole('slider', { name: 'Leverage' }).locator('..'),
    (p) => p.getByText(/Right now borrowing SOL/),
  ] },
  '/discover': { n: 4, name: 'Discover', calloutState: 'default', callouts: [
    (p) => p.getByRole('group', { name: 'What do you want to do?' }),
    (p) => p.getByText('on $1,000 · 30 days').first(),
    (p) => p.locator('[title="Kamino vault profile"]').first(),
    (p) => p.getByText(/SOL borrow currently costs more/),
    (p) => p.getByRole('group', { name: 'Layout' }),
  ] },
  '/position': { n: 5, name: 'Position', calloutState: 'interacting', callouts: [
    (p) => p.getByRole('group', { name: 'Choose a fix' }),
    (p) => p.getByText(/Fastest way back to safe/),
    (p) => p.getByText('Also turn on Auto-protect'),
    (p) => p.getByText(/Fires if SOL falls to/),
    (p) => p.getByRole('button', { name: /land at/ }),
  ] },
};
const only = process.argv.slice(2);
const ROUTES = only.length ? only : [...Object.keys(FEATURES), '/'];
const SIZES = { Desktop: { width: 1440, height: 900 }, Mobile: { width: 390, height: 844 } };

/* ── Runs in the page: returns an SVG string of the whole document ── */
async function serialize() {
  const sx = window.scrollX, sy = window.scrollY;
  const W = document.documentElement.scrollWidth, H = document.documentElement.scrollHeight;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const clear = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
  const R = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + sx, y: r.top + sy, w: r.width, h: r.height }; };
  const f = (n) => Math.round(n * 100) / 100;
  // rgb(a) → [hex, alpha]
  const col = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return ['#000000', 1];
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    const hex = '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    return [hex, p.length > 3 ? p[3] : 1];
  };
  const paint = (attr, c) => { const [h, a] = col(c); return `${attr}="${h}"${a < 1 ? ` ${attr}-opacity="${f(a)}"` : ''}`; };
  let uid = 0;
  const defs = [];

  // Baseline offset as a share of the glyph box, measured once per font.
  const bcache = new Map();
  const baseline = (cs) => {
    const key = `${cs.fontFamily}|${cs.fontSize}|${cs.fontWeight}`;
    if (bcache.has(key)) return bcache.get(key);
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;left:-9999px;top:0;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};line-height:normal;white-space:nowrap`;
    probe.innerHTML = 'Hg<span style="display:inline-block;width:0;height:0;vertical-align:baseline"></span>';
    document.body.appendChild(probe);
    const range = document.createRange(); range.selectNodeContents(probe.firstChild);
    const tr = range.getBoundingClientRect(), mr = probe.lastChild.getBoundingClientRect();
    const v = (mr.top - tr.top) / tr.height;
    probe.remove(); bcache.set(key, v); return v;
  };

  const SEM = ['header', 'nav', 'main', 'footer', 'section', 'article', 'figure', 'aside', 'label', 'dl', 'ol', 'ul', 'table', 'form'];
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const nameOf = (el, cs, box) => {
    const tag = el.tagName.toLowerCase(), role = el.getAttribute('role');
    const al = (el.getAttribute('aria-label') || '').trim();
    const txt = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 36);
    if (role === 'meter') return 'Health gauge';
    if (role === 'dialog') return `Sheet · ${al}`;
    if (role === 'slider') return `Slider thumb · ${al}`;
    if (role === 'group' || role === 'toolbar' || role === 'radiogroup') return `${cap(role)} · ${al}`;
    if (role === 'alert' || role === 'status') return `Alert · ${txt}`;
    if (tag === 'button') return `Button · ${al || txt}`;
    if (tag === 'a') return `Link · ${al || txt}`;
    if (tag === 'input') return `Input · ${al || el.id || el.type}`;
    if (/^h[1-6]$/.test(tag)) return `Heading · ${txt}`;
    if (SEM.includes(tag)) return `${cap(tag)}${al ? ` · ${al}` : ''}`;
    if (box) { const r = parseFloat(cs.borderTopLeftRadius) || 0; return r >= 999 ? `Pill · ${txt}` : r >= 12 ? 'Card' : 'Box'; }
    return 'Group';
  };

  const textOf = (node, cs) => {
    const s = node.textContent; if (!s.trim()) return '';
    const range = document.createRange();
    const lines = [];
    let cur = null;
    for (let i = 0; i < s.length; i++) {
      range.setStart(node, i); range.setEnd(node, i + 1);
      const rs = range.getClientRects(); if (!rs.length) continue;
      const r = rs[0]; if (r.width === 0 && /\s/.test(s[i])) continue;
      const top = Math.round(r.top);
      if (!cur || Math.abs(top - cur.top) > 2) { cur = { top, x: r.left + sx, h: r.height, y0: r.top + sy, chars: '' }; lines.push(cur); }
      cur.chars += /\s/.test(s[i]) ? ' ' : s[i];
    }
    if (!lines.length) return '';
    const tt = cs.textTransform;
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    const b = baseline(cs);
    const spans = lines.map((l) => {
      let t = l.chars.replace(/\s+$/, ''); if (tt === 'uppercase') t = t.toUpperCase(); else if (tt === 'capitalize') t = t.replace(/\b\w/g, (m) => m.toUpperCase());
      return `<tspan x="${f(l.x)}" y="${f(l.y0 + b * l.h)}">${esc(t)}</tspan>`;
    }).join('');
    const label = lines.map((l) => l.chars).join(' ').trim().replace(/\s+/g, ' ').slice(0, 40);
    // §w<weight> survives import in the layer name; a Figma post-process applies the exact style and strips it.
    return `<text id="${esc(label)}§w${cs.fontWeight}" font-family="${esc(fam)}" font-weight="${cs.fontWeight}" font-size="${parseFloat(cs.fontSize)}" ${paint('fill', cs.color)}${ls ? ` letter-spacing="${f(ls)}"` : ''} xml:space="preserve">${spans}</text>`;
  };

  const svgOf = (el) => {
    const b = R(el); if (!b.w || !b.h) return '';
    const vb = el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.width ? el.viewBox.baseVal : { x: 0, y: 0, width: b.w, height: b.h };
    const s = Math.min(b.w / vb.width, b.h / vb.height);
    const tx = b.x + (b.w - vb.width * s) / 2 - vb.x * s, ty = b.y + (b.h - vb.height * s) / 2 - vb.y * s;
    const clone = el.cloneNode(true);
    const src = [el, ...el.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')];
    const prefix = `s${++uid}-`;
    src.forEach((o, i) => {
      const c = dst[i], cs = getComputedStyle(o);
      for (const a of ['fill', 'stroke']) {
        const v = cs[a];
        if (!v || v === 'none') { if (o !== el) c.setAttribute(a, 'none'); continue; }
        if (v.startsWith('url(')) { c.setAttribute(a, v.replace(/url\(["']?#([^"')]+)["']?\)/, `url(#${prefix}$1)`)); continue; }
        const [h, al] = col(v); c.setAttribute(a, h); if (al < 1) c.setAttribute(`${a}-opacity`, f(al * (parseFloat(cs[`${a}Opacity`]) || 1)));
      }
      for (const [prop, attr] of [['strokeWidth', 'stroke-width'], ['strokeLinecap', 'stroke-linecap'], ['strokeLinejoin', 'stroke-linejoin'], ['strokeDasharray', 'stroke-dasharray'], ['opacity', 'opacity'], ['strokeOpacity', 'stroke-opacity'], ['fillOpacity', 'fill-opacity']]) {
        const v = cs[prop]; if (v && v !== 'none' && v !== 'normal' && !(attr.includes('opacity') && v === '1')) c.setAttribute(attr, v.replace('px', ''));
      }
      if (c.id) c.id = prefix + c.id;
      c.removeAttribute('class'); c.removeAttribute('style');
    });
    const name = el.getAttribute('role') === 'meter' ? 'Health gauge' : el.getAttribute('role') === 'img' ? 'Chart · net APY by leverage' : (el.getAttribute('class') || '').includes('lucide') ? `Icon · ${(el.getAttribute('class').match(/lucide-([a-z-]+)/g) || ['icon']).pop().replace('lucide-', '')}` : 'Vector';
    return `<g id="${esc(name)}" transform="translate(${f(tx)} ${f(ty)}) scale(${f(s)})">${clone.innerHTML}</g>`;
  };

  const imgOf = async (el) => {
    const b = R(el); if (!b.w) return '';
    let href = el.src;
    try {
      const c = document.createElement('canvas'); c.width = el.naturalWidth || 64; c.height = el.naturalHeight || 64;
      c.getContext('2d').drawImage(el, 0, 0, c.width, c.height); href = c.toDataURL('image/png');
    } catch {}
    const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const id = `c${++uid}`;
    if (r) defs.push(`<clipPath id="${id}"><rect x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}" rx="${f(Math.min(r, b.w / 2))}"/></clipPath>`);
    const nm = (el.getAttribute('src') || '').split('/').pop().replace(/\.\w+$/, '');
    return `<image id="Token · ${esc(nm)}" x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}" href="${href}"${r ? ` clip-path="url(#${id})"` : ''}/>`;
  };

  const walk = async (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return '';
    if (el instanceof SVGSVGElement) return svgOf(el);
    if (el.tagName === 'IMG') return imgOf(el);
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) return '';
    const b = R(el);
    let shape = '';
    const radius = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, b.w / 2, b.h / 2);
    let fill = !clear(cs.backgroundColor) ? paint('fill', cs.backgroundColor) : '';
    if (!fill && cs.backgroundImage.includes('gradient')) { const m = cs.backgroundImage.match(/rgba?\([^)]+\)/); if (m) { const [h] = col(m[0]); fill = `fill="${h}" fill-opacity="0.45"`; } }
    let stroke = '';
    const bw = parseFloat(cs.borderTopWidth) || 0;
    if (bw && !clear(cs.borderTopColor) && cs.borderTopStyle !== 'none') {
      if (bw === parseFloat(cs.borderBottomWidth) && bw === parseFloat(cs.borderLeftWidth)) stroke = `${paint('stroke', cs.borderTopColor)} stroke-width="${bw}"`;
      else {
        // single-side borders (dividers): draw as lines
        for (const [side, x1, y1, x2, y2] of [['Top', 0, 0, 1, 0], ['Bottom', 0, 1, 1, 1], ['Left', 0, 0, 0, 1], ['Right', 1, 0, 1, 1]]) {
          const w = parseFloat(cs[`border${side}Width`]) || 0; if (!w || clear(cs[`border${side}Color`])) continue;
          shape += `<line x1="${f(b.x + x1 * b.w)}" y1="${f(b.y + y1 * b.h)}" x2="${f(b.x + x2 * b.w)}" y2="${f(b.y + y2 * b.h)}" ${paint('stroke', cs[`border${side}Color`])} stroke-width="${w}"/>`;
        }
      }
    } else if (bw === 0) {
      for (const [side, x1, y1, x2, y2] of [['Top', 0, 0, 1, 0], ['Bottom', 0, 1, 1, 1]]) {
        const w = parseFloat(cs[`border${side}Width`]) || 0; if (!w || clear(cs[`border${side}Color`])) continue;
        shape += `<line x1="${f(b.x + x1 * b.w)}" y1="${f(b.y + y1 * b.h)}" x2="${f(b.x + x2 * b.w)}" y2="${f(b.y + y2 * b.h)}" ${paint('stroke', cs[`border${side}Color`])} stroke-width="${w}"/>`;
      }
    }
    // Tailwind rings are inset box-shadows: draw them as an inside stroke
    const ring = cs.boxShadow !== 'none' && cs.boxShadow.match(/(rgba?\([^)]+\))\s+0px\s+0px\s+0px\s+(\d+(?:\.\d+)?)px\s+inset/);
    if (ring && !stroke) stroke = `${paint('stroke', ring[1])} stroke-width="${ring[2]}"`;
    // Outer rings (e.g. slider thumb ring-4) are spread shadows without inset: draw a larger shape behind.
    // Tailwind stacks several shadows; take the widest non-inset zero-offset spread.
    const outer = cs.boxShadow === 'none' ? null : [...cs.boxShadow.matchAll(/(rgba?\([^)]+\))\s+0px\s+0px\s+0px\s+(\d+(?:\.\d+)?)px(?!\s+inset)/g)]
      .filter((m) => parseFloat(m[2]) > 0 && !clear(m[1])).sort((a, c) => parseFloat(c[2]) - parseFloat(a[2]))[0];
    if (outer && b.w && b.h) {
      const sp = parseFloat(outer[2]);
      var ringShape = `<rect id="Ring" x="${f(b.x - sp)}" y="${f(b.y - sp)}" width="${f(b.w + 2 * sp)}" height="${f(b.h + 2 * sp)}" rx="${f(radius + sp)}" ${paint('fill', outer[1])}/>`;
    }
    const visual = !!(fill || stroke);
    if (visual && b.w && b.h) {
      const inset = stroke ? parseFloat(stroke.match(/stroke-width="([\d.]+)"/)[1]) / 2 : 0;
      shape = `<rect id="Fill" x="${f(b.x + inset)}" y="${f(b.y + inset)}" width="${f(Math.max(0, b.w - 2 * inset))}" height="${f(Math.max(0, b.h - 2 * inset))}"${radius ? ` rx="${f(Math.max(0, radius - inset))}"` : ''} ${fill || 'fill="none"'} ${stroke}/>` + shape;
    }
    if (typeof ringShape === 'string') shape = ringShape + shape; // ring sits behind the element's own fill
    let inner = '';
    if (el.tagName === 'INPUT') {
      if (el.type === 'checkbox') {
        const accent = `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().split(' ').join(',')})`;
        inner = `<rect id="Checkbox" x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}" rx="3" ${el.checked ? paint('fill', accent) : 'fill="none" stroke="#8297AD"'}/>`
          + (el.checked ? `<path id="Tick" d="M${f(b.x + b.w * 0.25)} ${f(b.y + b.h * 0.52)} L${f(b.x + b.w * 0.43)} ${f(b.y + b.h * 0.7)} L${f(b.x + b.w * 0.76)} ${f(b.y + b.h * 0.32)}" fill="none" stroke="#04111D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : '');
      } else {
        const v = el.value || el.placeholder; if (v) {
          const fs = parseFloat(cs.fontSize), b0 = baseline(cs);
          const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
          const lh = fs * 1.3, y = b.y + b.h / 2 - lh / 2 + b0 * lh;
          inner = `<text id="${esc(v)}§w${cs.fontWeight}" font-family="${esc(fam)}" font-weight="${cs.fontWeight}" font-size="${fs}" ${paint('fill', el.value ? cs.color : 'rgb(130,151,173)')}><tspan x="${f(b.x + parseFloat(cs.paddingLeft))}" y="${f(y)}">${esc(v)}</tspan></text>`;
        }
      }
    }
    for (const n of el.childNodes) {
      if (n.nodeType === 3) inner += textOf(n, cs);
      else if (n.nodeType === 1) inner += await walk(n);
    }
    const clips = (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') && el !== document.body && el !== document.documentElement && b.w && b.h;
    let clipAttr = '';
    if (clips && inner) {
      const id = `c${++uid}`;
      defs.push(`<clipPath id="${id}"><rect x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}"${radius ? ` rx="${f(radius)}"` : ''}/></clipPath>`);
      clipAttr = ` clip-path="url(#${id})"`;
    }
    const op = parseFloat(cs.opacity);
    const tag = el.tagName.toLowerCase();
    const semantic = SEM.includes(tag) || ['button', 'a', 'input'].includes(tag) || el.hasAttribute('role') || /^h[1-6]$/.test(tag);
    if (!(visual || semantic || clipAttr || op < 1)) return inner;
    const body = clipAttr ? `${shape}<g id="Content"${clipAttr}>${inner}</g>` : shape + inner;
    if (!body) return '';
    return `<g id="${esc(nameOf(el, cs, visual))}"${op < 1 ? ` opacity="${f(op)}"` : ''}>${body}</g>`;
  };

  const bg = getComputedStyle(document.body).backgroundColor;
  const content = await walk(document.body);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join('')}</defs><rect id="Background" width="${W}" height="${H}" ${paint('fill', bg)}/>${content}</svg>`, W, H };
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const index = {};
for (const route of ROUTES) {
  const feat = FEATURES[route];
  const states = feat ? STATES : ['default'];
  for (const [size, viewport] of Object.entries(SIZES)) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', isMobile: size === 'Mobile', hasTouch: size === 'Mobile' });
    for (const st of states) {
      const q = new URLSearchParams({ clean: '1' }); if (st !== 'default') q.set('state', st);
      await page.goto(`http://localhost:5173${route}?${q}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'nav.fixed{position:static!important} header.sticky{position:relative!important} *{transition:none!important;animation:none!important}' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      // An open sheet scrolls inside the viewport; make the capture tall enough to show all of it.
      const sheetH = await page.evaluate(() => { const d = document.querySelector('[role=dialog]'); if (!d) return 0; const sc = d.querySelector('.overflow-y-auto'); return d.getBoundingClientRect().height + (sc ? sc.scrollHeight - sc.clientHeight : 0); });
      if (sheetH) { await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(sheetH / 0.92) + 40) }); await page.waitForTimeout(400); }
      const { svg, W, H } = await page.evaluate(serialize);
      if (sheetH) await page.setViewportSize(viewport);
      const label = feat ? `F${feat.n} ${feat.name} · ${size} · ${st[0].toUpperCase() + st.slice(1)}` : `Landing · ${size}`;
      const file = `${label.replace(/[^\w ·-]/g, '')}.svg`;
      fs.writeFileSync(path.join(OUT, file), svg);
      const entry = { file, label, W, H, route, state: st, size };
      if (feat && st === feat.calloutState && size === 'Desktop') {
        entry.callouts = [];
        for (const loc of feat.callouts) {
          const bb = await loc(page).first().boundingBox();
          const scrollY = await page.evaluate(() => window.scrollY);
          entry.callouts.push(bb ? { x: Math.round(bb.x), y: Math.round(bb.y + scrollY), w: Math.round(bb.width), h: Math.round(bb.height) } : null);
        }
      }
      (index[route] ??= []).push(entry);
      console.log(file, `${(svg.length / 1024).toFixed(0)} KB`);
    }
    await page.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
