/* Progressive enhancement for the floating bar and the stats fold. Without JS
   the links work, and the phone menu and the fold still open and close. */

/* Phone menu: close after choosing a link, on Escape, or on a tap outside. */
const menu = document.querySelector<HTMLDetailsElement>('.menu');
if (menu) {
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) menu.open = false;
  });
  document.addEventListener('click', (e) => {
    if (menu.open && !menu.contains(e.target as Node)) menu.open = false;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    menu.querySelector<HTMLElement>('summary')?.focus();
  });
}

/* A link to #stats opens the fold it points at. */
const fold = document.querySelector<HTMLDetailsElement>('#stats-fold');
if (fold) {
  const open = () => {
    fold.open = true;
  };
  document.querySelectorAll('a[href="#stats"]').forEach((a) => a.addEventListener('click', open));
  if (location.hash === '#stats') open();
}

/* Edge refraction for the bar: a displacement map, painted to the bar's exact
   size, that the #nav-lens SVG filter applies to whatever is behind the glass.
   Only Chromium runs an SVG filter inside backdrop-filter, and nothing reports
   that as a feature, so the gate is the Chromium-only userAgentData object.
   Every other browser keeps the frosted glass from the stylesheet. */
const glass = document.querySelector<HTMLElement>('.bar-glass');
const lensMap = document.getElementById('nav-lens-map');

if (glass && lensMap && 'userAgentData' in navigator) {
  const BEZEL = 0.92; // share of the bar's half-height that curves like a lens

  const paintLens = () => {
    const w = Math.round(glass.offsetWidth);
    const h = Math.round(glass.offsetHeight);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (w === 0 || h === 0 || !ctx) return;

    const image = ctx.createImageData(w, h);
    const r = h / 2;
    const bezel = r * BEZEL;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Position relative to the nearest point of the pill's centre line.
        const px = x + 0.5;
        const dx = px - Math.min(Math.max(px, r), w - r);
        const dy = y + 0.5 - r;
        const dist = Math.hypot(dx, dy);
        // 0 at the rim, 1 where the flat middle begins; the pull fades with a cubic.
        const t = Math.max((r - dist) / bezel, 0);
        const pull = dist > 0 && t < 1 ? (1 - t) ** 3 / dist : 0;
        // A convex rim shows what lies further in: sample towards the centre line.
        // Red carries the x offset and green the y offset; 128 means no shift.
        const i = (y * w + x) * 4;
        image.data[i] = 128 - dx * pull * 127;
        image.data[i + 1] = 128 - dy * pull * 127;
        image.data[i + 2] = 128;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    lensMap.setAttribute('href', canvas.toDataURL());
    lensMap.setAttribute('width', String(w));
    lensMap.setAttribute('height', String(h));
    glass.classList.add('lens');
  };

  // Fires once on observe, then whenever the bar changes size.
  new ResizeObserver(paintLens).observe(glass);
}
