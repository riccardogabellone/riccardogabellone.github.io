/* WCAG 2.x contrast validation of the real token pairs used on the site.
   Values MUST mirror src/styles/tokens.css — update both together. */
const L = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => (Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05);

const checks = [
  // [fg, bg, min, label] — 4.5 normal text, 3 large text / UI components
  ['#e8edf3', '#0d141c', 4.5, 'text on bg'],
  ['#b9c4d0', '#0d141c', 4.5, 'body on bg'],
  ['#b9c4d0', '#16202c', 4.5, 'body on panel'],
  ['#8593a1', '#16202c', 4.5, 'muted on panel'],
  ['#8593a1', '#0d141c', 4.5, 'muted on bg'],
  ['#8593a1', '#1d2937', 4.5, 'muted on panel-2 (tile labels)'],
  ['#e29b2d', '#0d141c', 4.5, 'gold on bg'],
  ['#e29b2d', '#16202c', 4.5, 'gold on panel'],
  ['#e29b2d', '#1d2937', 4.5, 'gold on panel-2 (stat values)'],
  ['#64a4e0', '#0d141c', 4.5, 'blue on bg'],
  ['#64a4e0', '#16202c', 4.5, 'blue on panel'],
  ['#16202c', '#e29b2d', 4.5, 'ink on gold (CTA / selected chip)'],
  ['#e8edf3', '#1d2937', 4.5, 'text on panel-2'],
];

let fail = 0;
for (const [fg, bg, min, label] of checks) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${r.toFixed(2)} (min ${min})`);
}
process.exit(fail ? 1 : 0);
