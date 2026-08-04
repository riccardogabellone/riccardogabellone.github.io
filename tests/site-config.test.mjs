import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSiteConfig } from '../src/lib/site-config.ts';

const minimal = `
name: Riccardo Gabellone
headline: Software Engineer
availability: { show: true, label: Open }
tagline: t
about: a
socials: { github: "https://g", linkedin: "https://l", x: "https://x", telegram: "https://t", email: "e@e.com" }
cv_pdf: null
skills: [{ group: Languages, items: [Python] }]
timeline: [{ kind: work, title: SE, org: Acme, org_url: null, start: 09/2022, end: 04/2026, bullets: [did x] }]
stats_section: { show: true }
`;

test('parses valid config', () => {
  const c = parseSiteConfig(minimal);
  assert.equal(c.name, 'Riccardo Gabellone');
  assert.equal(c.availability.show, true);
  assert.equal(c.timeline[0].kind, 'work');
});

test('rejects missing name', () => {
  assert.throws(() => parseSiteConfig('headline: x'));
});
