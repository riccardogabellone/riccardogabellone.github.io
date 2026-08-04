import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildYearGrid, clampTranslate, RAMP } from '../src/lib/contrib.ts';

test('grid covers a full year with correct leading blanks', () => {
  const g = buildYearGrid('2026', [{ date: '2026-01-05T00:00:00.000Z', intensity: '3', count: 7 }]);
  assert.equal(g.leadingBlanks, new Date(Date.UTC(2026, 0, 1)).getUTCDay());
  assert.equal(g.cells.length, 365); // 2026 is not a leap year
  const jan5 = g.cells.find((c) => c.date === '2026-01-05');
  assert.equal(jan5.intensity, 3);
  assert.equal(jan5.count, 7);
});

test('handles leap years', () => {
  const g = buildYearGrid('2024', []);
  assert.equal(g.cells.length, 366);
});

test('days without contributions are intensity 0', () => {
  const g = buildYearGrid('2026', []);
  assert.ok(g.cells.every((c) => c.intensity === 0));
});

test('clamps out-of-range intensities into 0..4', () => {
  const g = buildYearGrid('2026', [
    { date: '2026-02-01T00:00:00.000Z', intensity: '9', count: 1 },
    { date: '2026-02-02T00:00:00.000Z', intensity: 'garbage', count: 1 },
  ]);
  assert.equal(g.cells.find((c) => c.date === '2026-02-01').intensity, 4);
  assert.equal(g.cells.find((c) => c.date === '2026-02-02').intensity, 0);
});

test('ramp has 5 steps', () => {
  assert.equal(RAMP.length, 5);
});

test('clamp centers a grid smaller than the viewport', () => {
  const { x } = clampTranslate(-50, 0, 1, 800, 115, 400, 100);
  assert.ok(x >= 0 && x <= 400);
});

test('clamp bounds a grid larger than the viewport', () => {
  const { x } = clampTranslate(-9999, 0, 1, 800, 115, 2000, 100);
  assert.equal(x, 800 - 2000);
});
