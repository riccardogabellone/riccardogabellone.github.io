import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRefresh } from '../src/lib/revalidate-core.ts';

test('refreshes when remote is newer', () => {
  assert.equal(shouldRefresh('2026-08-01T00:00:00Z', '2026-08-03T00:00:00Z'), true);
});

test('skips when remote is same or older', () => {
  assert.equal(shouldRefresh('2026-08-03T00:00:00Z', '2026-08-01T00:00:00Z'), false);
  assert.equal(shouldRefresh('2026-08-03T00:00:00Z', '2026-08-03T00:00:00Z'), false);
});

test('skips on unparsable dates', () => {
  assert.equal(shouldRefresh('garbage', '2026-08-03T00:00:00Z'), false);
  assert.equal(shouldRefresh('2026-08-03T00:00:00Z', 'garbage'), false);
});
