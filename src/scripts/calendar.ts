/* Progressive enhancement over the server-rendered contribution grid:
   year switching, pointer pan, wheel zoom, two-pointer pinch. Without JS the
   baked latest-year grid (and its title tooltips) remain fully usable. */
import { buildYearGrid, clampTranslate, RAMP } from '../lib/contrib';
import type { BakedStats, DayContribution, YearTotal } from '../lib/stats';

type ContributionData = { years: YearTotal[]; contributions: DayContribution[] };

const dataEl = document.getElementById('contrib-data');
const viewport = document.getElementById('contrib-viewport');
const wrapper = document.getElementById('contrib-transform');
const gridEl = document.getElementById('contrib-grid');
const yearsEl = document.getElementById('contrib-years');
const calendar = viewport?.closest<HTMLElement>('.calendar');

if (dataEl && viewport && wrapper && gridEl && yearsEl && calendar) {
  let data: ContributionData | null = null;
  try {
    data = JSON.parse(dataEl.textContent ?? '');
  } catch {
    data = null;
  }

  if (data && Array.isArray(data.years) && Array.isArray(data.contributions)) {
    let selectedYear = calendar.dataset.latestYear ?? '';
    // Take over from the CSS no-JS scroll fallback: pan/zoom owns the viewport now.
    viewport.style.overflow = 'hidden';
    viewport.style.touchAction = 'none';
    let scale = 1;
    const translate = { x: 0, y: 0 };
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 4;

    const applyTransform = () => {
      wrapper.style.transform = `translate(${translate.x}px, ${translate.y}px) scale(${scale})`;
    };

    const clampNow = (x: number, y: number) => {
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const gw = gridEl.offsetWidth;
      const gh = gridEl.offsetHeight;
      return clampTranslate(x, y, scale, vw, vh, gw, gh);
    };

    const fitToViewport = () => {
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const gw = gridEl.offsetWidth;
      const gh = gridEl.offsetHeight;
      if (gw === 0 || gh === 0) return;
      scale = Math.max(MIN_SCALE, Math.min(vw / gw, vh / gh, 1));
      const clamped = clampNow((vw - gw * scale) / 2, (vh - gh * scale) / 2);
      translate.x = clamped.x;
      translate.y = clamped.y;
      applyTransform();
    };

    const renderYear = (year: string) => {
      if (!data) return;
      const { cells, leadingBlanks } = buildYearGrid(year, data.contributions);
      const parts: string[] = [];
      for (let i = 0; i < leadingBlanks; i++) parts.push('<div class="cell blank"></div>');
      for (const c of cells) {
        const title = c.count > 0 ? `${c.date}: ${c.count} contribution${c.count === 1 ? '' : 's'}` : c.date;
        parts.push(`<div class="cell" style="background:${RAMP[c.intensity]}" title="${title}"></div>`);
      }
      gridEl.innerHTML = parts.join('');
      const total = data.years.find((y) => y.year === year)?.total ?? 0;
      viewport.setAttribute(
        'aria-label',
        `GitHub contribution calendar, ${total.toLocaleString('en-US')} contributions in ${year}`,
      );
      requestAnimationFrame(fitToViewport);
    };

    const selectYear = (year: string) => {
      if (year === selectedYear) return;
      selectedYear = year;
      yearsEl.querySelectorAll<HTMLButtonElement>('.year-chip').forEach((btn) => {
        const isSelected = btn.dataset.year === year;
        btn.classList.toggle('selected', isSelected);
        btn.setAttribute('aria-pressed', String(isSelected));
      });
      renderYear(year);
    };

    yearsEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.year-chip');
      if (btn?.dataset.year) selectYear(btn.dataset.year);
    });

    /* --- pointer pan + pinch --- */
    const pointers = new Map<number, { x: number; y: number }>();
    let panStart: { x: number; y: number } | null = null;
    let pinchStart: { dist: number; mid: { x: number; y: number }; scale: number } | null = null;

    const midAndDist = () => {
      const pts = [...pointers.values()];
      const rect = viewport.getBoundingClientRect();
      const p0 = pts[0];
      const p1 = pts[1];
      if (p0 === undefined || p1 === undefined) return null;
      return {
        dist: Math.hypot(p0.x - p1.x, p0.y - p1.y),
        mid: { x: (p0.x + p1.x) / 2 - rect.left, y: (p0.y + p1.y) / 2 - rect.top },
      };
    };

    viewport.addEventListener('pointerdown', (e) => {
      viewport.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        panStart = { x: e.clientX - translate.x, y: e.clientY - translate.y };
        calendar.classList.add('grabbing');
      } else if (pointers.size === 2) {
        panStart = null;
        const md = midAndDist();
        if (md) pinchStart = { ...md, scale };
      }
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1 && panStart) {
        const clamped = clampNow(e.clientX - panStart.x, e.clientY - panStart.y);
        translate.x = clamped.x;
        translate.y = clamped.y;
        applyTransform();
      } else if (pointers.size === 2 && pinchStart) {
        const md = midAndDist();
        if (!md) return;
        const factor = md.dist / (pinchStart.dist || 1);
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStart.scale * factor));
        const cx = (pinchStart.mid.x - translate.x) / scale;
        const cy = (pinchStart.mid.y - translate.y) / scale;
        scale = newScale;
        const clamped = clampNow(md.mid.x - cx * scale, md.mid.y - cy * scale);
        translate.x = clamped.x;
        translate.y = clamped.y;
        applyTransform();
      }
    });

    const endPointer = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        panStart = null;
        pinchStart = null;
        calendar.classList.remove('grabbing');
      } else if (pointers.size === 1) {
        pinchStart = null;
        const rest = [...pointers.values()][0];
        if (rest) panStart = { x: rest.x - translate.x, y: rest.y - translate.y };
      }
    };
    viewport.addEventListener('pointerup', endPointer);
    viewport.addEventListener('pointercancel', endPointer);

    viewport.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const cx = (px - translate.x) / scale;
        const cy = (py - translate.y) / scale;
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
        const clamped = clampNow(px - cx * scale, py - cy * scale);
        translate.x = clamped.x;
        translate.y = clamped.y;
        applyTransform();
      },
      { passive: false },
    );

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fitToViewport, 150);
    });

    /* Fresh stats from the background revalidation (see revalidate.ts). */
    window.addEventListener('stats:refresh', (e) => {
      const fresh = (e as CustomEvent<BakedStats>).detail;
      const cd = fresh?.contributionData;
      if (!cd || !Array.isArray(cd.years) || !Array.isArray(cd.contributions)) return;
      data = cd;
      const totals = new Map(cd.years.map((y) => [y.year, y.total]));
      yearsEl.querySelectorAll<HTMLButtonElement>('.year-chip').forEach((btn) => {
        const y = btn.dataset.year;
        const total = y !== undefined ? totals.get(y) : undefined;
        if (y !== undefined && total !== undefined) btn.textContent = `${y}: ${total.toLocaleString('en-US')}`;
      });
      renderYear(selectedYear);
    });

    fitToViewport();
  }
}
