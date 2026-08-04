/* Stale-while-revalidate: the page ships fully baked; after load we ask GAS
   whether the sheet has newer data and patch numbers in place if so.
   Every failure path is silent — the baked data always stands. */
import { shouldRefresh } from '../lib/revalidate-core';

// Twin constant: scripts/fetch-stats.mjs uses the same URL at build time.
const GAS_STATS_URL =
  'https://script.google.com/macros/s/AKfycbyzbrUmB1JTP23S1Tl8bHnIf1JnV0MMCOzdEdpJmSrZ4BW-RPBQthAEs7ghze1y3u3BXQ/exec';

const NUMERIC_KEYS = [
  'commitsCount',
  'ownedRepoCount',
  'contributedReposCount',
  'prCount',
  'issuesCount',
  'followers',
] as const;

window.addEventListener('load', () => {
  const label = document.querySelector<HTMLElement>('[data-stat="fetchedAt-label"]');
  const bakedFetchedAt = label?.getAttribute('data-fetched-at');
  if (!label || bakedFetchedAt === null || bakedFetchedAt === undefined) return;

  void (async () => {
    try {
      const res = await fetch(GAS_STATS_URL, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return;
      const payload: unknown = await res.json();
      if (payload === null || typeof payload !== 'object' || 'error' in payload) return;
      const stats = payload as Record<string, unknown>;
      const lastUpdated = typeof stats.lastUpdated === 'string' ? stats.lastUpdated : '';
      if (!shouldRefresh(bakedFetchedAt, lastUpdated)) return;

      for (const key of NUMERIC_KEYS) {
        const el = document.querySelector<HTMLElement>(`[data-stat="${key}"]`);
        const value = typeof stats[key] === 'string' ? Number(stats[key]) : stats[key];
        if (el && typeof value === 'number' && Number.isFinite(value)) {
          el.textContent = value.toLocaleString('en-US');
        }
      }
      label.textContent = `Stats as of ${new Date(lastUpdated).toISOString().slice(0, 10)} (live)`;
      window.dispatchEvent(new CustomEvent('stats:refresh', { detail: stats }));
    } catch {
      /* baked data stands */
    }
  })();
});
