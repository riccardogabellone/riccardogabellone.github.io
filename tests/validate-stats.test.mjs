import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStats } from '../scripts/lib/validate-stats.mjs';

const good = {
  userName: 'R',
  userBio: 'b',
  userAvatarUrl: 'https://a/x.png',
  commitsCount: 1,
  ownedRepoCount: 2,
  contributedReposCount: 3,
  prCount: 4,
  issuesCount: 5,
  followers: 6,
  languages: [{ name: 'Rust', percentage: 60.5 }],
  lastUpdated: '2026-08-01T00:00:00.000Z',
  contributionData: {
    years: [{ year: '2026', total: 100 }],
    contributions: [{ date: '2026-01-05T00:00:00.000Z', intensity: '3', count: 7 }],
  },
};

test('accepts a valid payload', () => {
  const s = validateStats(good);
  assert.equal(s.commitsCount, 1);
  assert.equal(s.languages[0].percentage, 60.5);
});

test('coerces numeric strings from the sheet', () => {
  const s = validateStats({
    ...good,
    commitsCount: '1234',
    languages: [{ name: 'R', percentage: '60.5' }],
  });
  assert.equal(s.commitsCount, 1234);
  assert.equal(s.languages[0].percentage, 60.5);
});

test('normalizes contribution dates and drops inactive days', () => {
  const s = validateStats({
    ...good,
    contributionData: {
      years: [{ year: '2026', total: 7 }],
      contributions: [
        { date: '2026-01-05T00:00:00.000Z', intensity: '3', count: 7 },
        { date: '2026-01-06T00:00:00.000Z', intensity: '0', count: 0 },
        { date: '2026-01-07T00:00:00.000Z', intensity: '2', count: 0 }, // GAS: activity w/o count
      ],
    },
  });
  assert.deepEqual(
    s.contributionData.contributions.map((c) => c.date),
    ['2026-01-05', '2026-01-07'],
  );
});

test('clamps intensity to a 0-4 integer string (injection boundary)', () => {
  const s = validateStats({
    ...good,
    contributionData: {
      years: [{ year: '2026', total: 7 }],
      contributions: [
        { date: '2026-01-05T00:00:00.000Z', intensity: '9', count: 1 },
        { date: '2026-01-06T00:00:00.000Z', intensity: '</script><img>', count: 1 },
      ],
    },
  });
  assert.equal(s.contributionData.contributions[0].intensity, '4');
  assert.equal(s.contributionData.contributions[1].intensity, '0');
});

test('rejects non-4-digit years (injection boundary)', () => {
  assert.throws(() =>
    validateStats({
      ...good,
      contributionData: {
        years: [{ year: '</script>', total: 1 }],
        contributions: [],
      },
    }),
  );
});

test('rejects a GAS error payload', () => {
  assert.throws(() => validateStats({ error: 'boom' }));
});

test('rejects missing contributionData', () => {
  const { contributionData, ...rest } = good;
  assert.throws(() => validateStats(rest));
});
