import fs from 'node:fs';
import { validateStats } from './lib/validate-stats.mjs';

// Twin constant: src/scripts/revalidate.ts uses the same URL client-side.
const URL_ =
  process.env.GAS_STATS_URL ??
  'https://script.google.com/macros/s/AKfycbyzbrUmB1JTP23S1Tl8bHnIf1JnV0MMCOzdEdpJmSrZ4BW-RPBQthAEs7ghze1y3u3BXQ/exec';
const OUT = new URL('../src/data/github-stats.json', import.meta.url);
const TIMEOUT_MS = 20_000;
const RETRIES = 2;

async function attempt() {
  const res = await fetch(URL_, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
  if (!res.ok) throw new Error(`GAS HTTP ${res.status}`);
  return validateStats(await res.json());
}

let stats = null;
for (let i = 0; i <= RETRIES && stats === null; i++) {
  try {
    stats = await attempt();
  } catch (e) {
    console.warn(`fetch-stats: attempt ${i + 1} failed: ${e.message}`);
  }
}

if (stats) {
  fs.writeFileSync(OUT, JSON.stringify({ ...stats, fetchedAt: new Date().toISOString() }, null, 2) + '\n');
  console.log('fetch-stats: snapshot refreshed');
} else if (fs.existsSync(OUT)) {
  console.warn('fetch-stats: GAS unreachable — building with committed last-good snapshot');
} else {
  console.error('fetch-stats: GAS unreachable and no committed snapshot exists');
  process.exit(1);
}
