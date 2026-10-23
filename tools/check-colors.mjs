// WCAG contrast + colour-vision-deficiency check for the design tokens.
// CVD simulation: Machado et al. 2009 matrices (severity 1.0), applied in linear RGB.
// Distinguishability: CIEDE2000-lite (CIE76 ΔE in Lab), threshold 20 = clearly different at a glance.
import fs from 'node:fs';

const tokens = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const M = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const toLab = (rgbLin) => {
  const [r, g, b] = rgbLin.map((v) => Math.min(1, Math.max(0, v)));
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
};
const sim = (h, m) => { const c = hex(h).map(lin); return m ? m.map((row) => row[0] * c[0] + row[1] * c[1] + row[2] * c[2]) : c; };
const dE = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

let fail = 0;
console.log('— Text contrast (AA: 4.5 body, 3.0 large/UI) —');
for (const [fgName, min] of tokens.textChecks) {
  for (const bgName of tokens.surfaces) {
    const r = contrast(tokens.colors[fgName], tokens.colors[bgName]);
    const ok = r >= min;
    if (!ok) fail++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${fgName.padEnd(16)} on ${bgName.padEnd(10)} ${r.toFixed(2)} (min ${min})`);
  }
}
console.log('\n— Risk scale distinguishability (ΔE ≥ 20) —');
const risk = tokens.riskScale;
for (const [mode, m] of [['normal', null], ...Object.entries(M)]) {
  const labs = risk.map((n) => toLab(sim(tokens.colors[n], m)));
  const pairs = [[0, 1], [1, 2], [0, 2]].map(([i, j]) => `${risk[i]}↔${risk[j]} ${dE(labs[i], labs[j]).toFixed(0)}`);
  const minDE = Math.min(...[[0, 1], [1, 2], [0, 2]].map(([i, j]) => dE(labs[i], labs[j])));
  if (minDE < 20) fail++;
  console.log(`${minDE >= 20 ? 'ok  ' : 'FAIL'} ${mode.padEnd(7)} ${pairs.join(' · ')}  | L*: ${labs.map((l) => l[0].toFixed(0)).join('/')}`);
}
process.exitCode = fail ? 1 : 0;
console.log(fail ? `\n${fail} failures` : '\nall checks pass');
