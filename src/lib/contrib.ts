import type { DayContribution } from './stats';

/* Sequential single-hue ramp, navy surface → brand gold (dark-mode steps). */
export const RAMP = ['#1a2430', '#54411f', '#7a5a24', '#b07e28', '#e8a93c'];

export interface GridCell {
  date: string;
  intensity: number;
  count: number;
}

export function buildYearGrid(year: string, contributions: DayContribution[]) {
  const y = Number(year);
  const map = new Map(
    contributions.filter((c) => c.date.startsWith(year)).map((c) => [c.date.slice(0, 10), c]),
  );
  const start = new Date(Date.UTC(y, 0, 1));
  const end = new Date(Date.UTC(y, 11, 31));
  const leadingBlanks = start.getUTCDay();
  const cells: GridCell[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const hit = map.get(key);
    cells.push({
      date: key,
      intensity: hit ? Math.min(4, Math.max(0, Number(hit.intensity) || 0)) : 0,
      count: hit ? hit.count : 0,
    });
  }
  return { cells, leadingBlanks };
}

export function clampTranslate(
  x: number,
  y: number,
  scale: number,
  viewW: number,
  viewH: number,
  gridW: number,
  gridH: number,
) {
  const sw = gridW * scale;
  const sh = gridH * scale;
  const cx = sw <= viewW ? Math.max(0, Math.min(x, viewW - sw)) : Math.max(viewW - sw, Math.min(x, 0));
  const cy = sh <= viewH ? Math.max(0, Math.min(y, viewH - sh)) : Math.max(viewH - sh, Math.min(y, 0));
  return { x: cx, y: cy };
}
