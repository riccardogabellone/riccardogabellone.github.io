# Portfolio Refactor (Astro 7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild riccardogabellone.github.io as an Astro 7 static site with the CV design system (dark), build-time-baked GitHub stats from the GAS endpoint, YAML-driven content, and a CI-verified byte-identical Tesla PEM.

**Architecture:** Static Astro 7 site (no framework islands — vanilla `<script>` modules only), content from YAML validated at build, GitHub stats fetched at build with committed last-good fallback, deployed to GitHub Pages via Actions with post-deploy PEM verification. Spec: `docs/superpowers/specs/2026-08-04-portfolio-refactor-design.md`.

**Tech Stack:** Astro 7.x (latest), pnpm (via corepack), TypeScript (`astro check`), `yaml` package, `node --test` for unit tests, GitHub Actions (`withastro/action@v6`, `actions/deploy-pages@v5`), Chrome DevTools MCP for visual/perf verification.

## Global Constraints

- Branch: all work on `refactor/astro-portfolio`. Never commit to `main` directly; `main` is the live site.
- Tesla PEM: `/.well-known/appspecific/com.tesla.3p.public-key.pem` — bytes NEVER change. sha256 invariant: `968674d7fa9426c7e78d5cf7fcc81d4c3d7fd15f496dff64c03a916ca5c3d93d`.
- No Tailwind, no Google Fonts CDN, no Material Symbols CDN, no icon fonts. Icons = inline Lucide SVGs. Fonts = self-hosted via Astro's stable Fonts API.
- Privacy: site content must never include phone number, salary data, NDA/employer repo names, or anything from PORTFOLIO.md beyond the six projects listed in the spec.
- Accessibility: every text/background pair passes WCAG AA (≥4.5:1 normal text, ≥3:1 large text/UI), verified by `scripts/check-contrast.mjs` (Task 10). `prefers-reduced-motion` respected. Keyboard-accessible interactive elements with visible focus.
- Astro 7 Rust compiler is strict: every non-void element needs a closing tag. `compressHTML` defaults to `'jsx'`: whitespace between inline elements is stripped — use explicit spaces where needed.
- GAS endpoint is the single source of stats truth: `https://script.google.com/macros/s/AKfycbyzbrUmB1JTP23S1Tl8bHnIf1JnV0MMCOzdEdpJmSrZ4BW-RPBQthAEs7ghze1y3u3BXQ/exec`. A GAS failure must never fail a build.
- Copy rules: English; concrete, factual tone (no "passionate"); content sourced from `D:\Users\ricca\Documenti\cv_resumee\PROFILE.md` public-safe sections only.
- Every task: run `pnpm check` (astro check) and `pnpm build` before its commit step; both must pass.

## Skills to load per task (mandatory, at task start)

| Task | Skills |
|---|---|
| 1–4 | superpowers:test-driven-development (3, 4), superpowers:verification-before-completion (all) |
| 5–8 | frontend-design (5, 6, 7, 8); dataviz (6, 8 — language bars + contribution calendar are charts) |
| 10 | web-perf, chrome-devtools-mcp:chrome-devtools, chrome-devtools-mcp:a11y-debugging |
| 12 | superpowers:requesting-code-review, security-review, superpowers:finishing-a-development-branch |

## File structure (target)

```
├── astro.config.mjs            ├── src/
├── package.json                │   ├── assets/fonts/*.woff2
├── pnpm-lock.yaml              │   ├── components/ (Hero, StatTiles, LanguageBars, ContribCalendar,
├── tsconfig.json               │   │    ProjectCard, Timeline, SkillChips, Contact, Footer, Icon)
├── .gitignore                  │   ├── data/ (site.yaml, projects.yaml, github-stats.json)
├── public/                     │   ├── layouts/Base.astro
│   ├── .well-known/appspecific/com.tesla.3p.public-key.pem
│   ├── cv/ (.gitkeep; PDF is a user manual step)
│   ├── images/riccardo.jpg     │   ├── lib/ (site-config.ts, stats.ts, contrib.ts)
│   └── favicon.png             │   ├── pages/index.astro
├── scripts/                    │   ├── scripts/ (calendar.ts, revalidate.ts — client)
│   ├── fetch-stats.mjs         │   └── styles/ (tokens.css, global.css)
│   ├── lib/validate-stats.mjs  ├── src/content.config.ts
│   └── check-contrast.mjs      └── .github/workflows/deploy.yml
├── tests/*.test.mjs
```

---

### Task 1: Scaffold Astro 7, move the PEM, wire fonts

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/pages/index.astro` (placeholder), `public/cv/.gitkeep`
- Move: `.well-known/appspecific/com.tesla.3p.public-key.pem` → `public/.well-known/appspecific/com.tesla.3p.public-key.pem` (git mv), `favicon.png` → `public/favicon.png`
- Copy: latin woff2 fonts from `D:\Users\ricca\Documenti\cv_resumee\fonts\` → `src/assets/fonts/`; `D:\Users\ricca\Documenti\cv_resumee\photo.jpg` → `public/images/riccardo.jpg`
- Delete: `index.html` (old site; branch only — main still serves it)

**Interfaces:**
- Produces: working `pnpm dev`/`pnpm build`/`pnpm check`; font cssVariables `--font-display` (Space Grotesk), `--font-body` (Inter), `--font-mono` (JetBrains Mono) usable everywhere; `dist/.well-known/...pem` byte-identical.

- [ ] **Step 1: Enable pnpm and init the project**

```bash
corepack enable pnpm   # if corepack missing: npm i -g pnpm
cd C:/Users/ricca/mProjects/riccardogabellone.github.io
pnpm init
pnpm add astro
pnpm add -D @astrojs/check typescript yaml
```

If Astro's engines check rejects Node 22.14, install Node 24 LTS (`winget install OpenJS.NodeJS.LTS`) and re-run.

- [ ] **Step 2: Write `.gitignore`, `package.json` scripts, `tsconfig.json`**

`.gitignore`:

```
node_modules/
dist/
.astro/
```

`package.json` — set (keep pnpm's generated fields; add `packageManager` matching the installed pnpm major):

```json
{
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "node scripts/fetch-stats.mjs && astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "node --test tests/"
  }
}
```

Until Task 4 exists, temporarily use `"build": "astro build"` — Task 4 switches it to the line above.

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src/**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 3: Move files (bytes untouched)**

```bash
mkdir -p public/.well-known/appspecific public/cv public/images src/assets/fonts
git mv .well-known/appspecific/com.tesla.3p.public-key.pem public/.well-known/appspecific/com.tesla.3p.public-key.pem
git mv favicon.png public/favicon.png
git rm index.html
touch public/cv/.gitkeep
cp "D:/Users/ricca/Documenti/cv_resumee/photo.jpg" public/images/riccardo.jpg
```

Copy exactly these fonts (latin subset, weights used by the design):

```bash
CVF="D:/Users/ricca/Documenti/cv_resumee/fonts"
cp "$CVF"/fontsource-space-grotesk-*/files/space-grotesk-latin-{500,600,700}-normal.woff2 src/assets/fonts/
cp "$CVF"/fontsource-inter-*/files/inter-latin-{400,500,600}-normal.woff2 src/assets/fonts/
cp "$CVF"/fontsource-jetbrains-mono-*/files/jetbrains-mono-latin-{400,500,700}-normal.woff2 src/assets/fonts/
```

- [ ] **Step 4: Write `astro.config.mjs`** (Fonts API is stable in Astro 7 — one entry per family, local provider)

```js
// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

const fv = (file, weight) => ({ src: [`./src/assets/fonts/${file}`], weight, style: 'normal' });

export default defineConfig({
  site: 'https://riccardogabellone.github.io',
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Space Grotesk',
      cssVariable: '--font-display',
      options: {
        variants: [
          fv('space-grotesk-latin-500-normal.woff2', '500'),
          fv('space-grotesk-latin-600-normal.woff2', '600'),
          fv('space-grotesk-latin-700-normal.woff2', '700'),
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-body',
      options: {
        variants: [
          fv('inter-latin-400-normal.woff2', '400'),
          fv('inter-latin-500-normal.woff2', '500'),
          fv('inter-latin-600-normal.woff2', '600'),
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      options: {
        variants: [
          fv('jetbrains-mono-latin-400-normal.woff2', '400'),
          fv('jetbrains-mono-latin-500-normal.woff2', '500'),
          fv('jetbrains-mono-latin-700-normal.woff2', '700'),
        ],
      },
    },
  ],
});
```

If the running Astro 7.x rejects this shape, consult https://docs.astro.build/en/guides/fonts/ and adapt — the requirement is: three families, local provider, those exact cssVariable names.

- [ ] **Step 5: Placeholder page** — `src/pages/index.astro`:

```astro
---
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Riccardo Gabellone</title>
  </head>
  <body>
    <h1>Scaffold OK</h1>
  </body>
</html>
```

- [ ] **Step 6: Verify build + PEM invariant**

```bash
pnpm check && pnpm build
sha256sum dist/.well-known/appspecific/com.tesla.3p.public-key.pem
```

Expected: build succeeds; hash is exactly `968674d7fa9426c7e78d5cf7fcc81d4c3d7fd15f496dff64c03a916ca5c3d93d`. If the file is missing from `dist/`, STOP — `public/` copying is broken; do not proceed.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: scaffold Astro 7, move PEM+favicon to public/, self-host fonts"
```

---

### Task 2: Design tokens, global styles, Base layout

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Icon.astro`
- Modify: `src/pages/index.astro` (use the layout)

**Interfaces:**
- Produces: CSS custom properties (below) used by every component; `Base.astro` slot-based layout with props `{ title: string; description: string }`; `<Icon name="..." />` rendering inline Lucide SVGs (stroke, currentColor, 24×24 viewBox, `aria-hidden="true"`), names needed later: `github`, `linkedin`, `x`, `send` (telegram), `mail`, `download`, `external-link`, `briefcase`, `graduation-cap`, `terminal`, `activity`, `star`, `arrow-up-right`.

- [ ] **Step 1: `src/styles/tokens.css`** — dark adaptation of the CV system (`cv_resumee/cv.html` is the reference; claimed ratios verified in Task 10):

```css
:root {
  /* surfaces — derived from CV --ink #16202C */
  --bg: #0d141c;
  --panel: #16202c;
  --panel-2: #1d2937;
  --line: #2a3648;
  /* text */
  --text: #e8edf3;
  --body-text: #b9c4d0;
  --muted: #8593a1;      /* CV --muted, passes AA on --bg and --panel */
  /* accents — lightened from CV gold #B06E08 / blue #2A6CB0 for AA on dark */
  --gold: #e29b2d;
  --blue: #64a4e0;
  --gold-deep: #b06e08;  /* decorative/large only (lightbar, borders) */
  --blue-deep: #2a6cb0;  /* decorative/large only */
  /* fonts (variables provided by Astro Fonts API) */
  --font-display: var(--font-display);
  --font-body: var(--font-body);
  --font-mono: var(--font-mono);
  /* layout */
  --radius: 10px;
  --content-width: 72rem;
}
```

(Delete the three self-referential `--font-*` lines if `astro check`/build flags them — the Fonts API already defines these variables globally; they are listed here for documentation.)

- [ ] **Step 2: `src/styles/global.css`** — minimal reset + base typography + signature elements:

```css
@import './tokens.css';

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--body-text);
  font-family: var(--font-body), system-ui, sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { font-family: var(--font-display), system-ui, sans-serif; color: var(--text); line-height: 1.2; }
a { color: var(--blue); }
a:hover { color: var(--gold); }
:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; border-radius: 2px; }
code, .mono { font-family: var(--font-mono), monospace; }

/* signature: // section title prefix */
.section-title { font-size: 1.5rem; font-weight: 600; margin: 0 0 1.25rem; }
.section-title::before { content: '// '; color: var(--gold); font-family: var(--font-mono), monospace; }
.section-title.alt::before { color: var(--blue); }

/* signature: lightbar — gold → ink → blue */
.lightbar { height: 3px; border: 0; margin: 0; background: linear-gradient(90deg, var(--gold-deep), var(--panel) 50%, var(--blue-deep)); }

.panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 1.5rem; }
.container { max-width: var(--content-width); margin: 0 auto; padding: 0 1rem; }
.chip { font-family: var(--font-mono), monospace; font-size: 0.8rem; border: 1px solid var(--line); border-radius: 999px; padding: 0.2rem 0.75rem; color: var(--body-text); }
.chip.hot { border-color: var(--gold-deep); color: var(--gold); }
```

- [ ] **Step 3: `src/layouts/Base.astro`**

```astro
---
import { Font } from 'astro:assets';
import '../styles/global.css';
interface Props { title: string; description: string; }
const { title, description } = Astro.props;
const og = new URL('/images/riccardo.jpg', Astro.site);
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="icon" href="/favicon.png" type="image/png" />
    <link rel="canonical" href={Astro.site} />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={og} />
    <meta name="theme-color" content="#0d141c" />
    <Font cssVariable="--font-display" preload />
    <Font cssVariable="--font-body" preload />
    <Font cssVariable="--font-mono" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 4: `src/components/Icon.astro`** — one component, a `name` prop, a record of Lucide path data. Copy path data from https://lucide.dev (each icon page → SVG). Shape:

```astro
---
interface Props { name: string; size?: number; }
const { name, size = 20 } = Astro.props;
const paths: Record<string, string> = {
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  /* github, linkedin, x, send, download, external-link, briefcase,
     graduation-cap, terminal, activity, star, arrow-up-right — same pattern,
     inner SVG markup from lucide.dev */
};
---
<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
  stroke-linejoin="round" aria-hidden="true" set:html={paths[name] ?? ''}>
</svg>
```

Fill ALL names listed in Interfaces — a missing name renders an empty SVG, which Task 10's visual pass will catch.

- [ ] **Step 5: Update placeholder page to use Base + tokens, then verify**

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Riccardo Gabellone — Software Engineer" description="Backend & Distributed Systems">
  <main class="container">
    <h1>Riccardo Gabellone</h1>
    <hr class="lightbar" />
    <h2 class="section-title">Tokens live</h2>
    <span class="chip hot">Rust</span>
  </main>
</Base>
```

Run: `pnpm check && pnpm build && pnpm dev` — open http://localhost:4321 with Chrome DevTools MCP, screenshot, confirm: dark bg, Space Grotesk heading, gold `//` prefix, lightbar visible, no console errors.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: CV design tokens (dark), base layout, Lucide icon component"`

---

### Task 3: Content layer — schemas, site.yaml, projects.yaml

**Files:**
- Create: `src/content.config.ts`, `src/data/site.yaml`, `src/data/projects.yaml`, `src/lib/site-config.ts`, `tests/site-config.test.mjs`

**Interfaces:**
- Produces: `getSiteConfig(): SiteConfig` (parsed+validated site.yaml; throws on invalid); projects collection queried with `getCollection('projects')`, entry data typed `{ title: string; tagline: string; description: string; tech: string[]; links: { live?: string; playstore?: string; repo?: string }; status: 'featured'|'listed'|'hidden'; order: number }`.

- [ ] **Step 1: Write the failing test** — `tests/site-config.test.mjs`:

```js
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
```

Run: `pnpm test` → Expected: FAIL (module not found). Note: `node --test` cannot import `.ts` directly on Node 22 — if the import fails for that reason, run tests with `node --experimental-strip-types --test tests/` and set that as the `test` script.

- [ ] **Step 2: Implement `src/lib/site-config.ts`**

```ts
import { parse } from 'yaml';
import { z } from 'astro/zod';
import fs from 'node:fs';

const schema = z.object({
  name: z.string(),
  headline: z.string(),
  availability: z.object({ show: z.boolean(), label: z.string() }),
  tagline: z.string(),
  about: z.string(),
  socials: z.object({
    github: z.string().url(), linkedin: z.string().url(), x: z.string().url(),
    telegram: z.string().url(), email: z.string().email(),
  }),
  cv_pdf: z.string().nullable(),
  skills: z.array(z.object({ group: z.string(), items: z.array(z.string()) })),
  timeline: z.array(z.object({
    kind: z.enum(['work', 'education']),
    title: z.string(), org: z.string(), org_url: z.string().url().nullable(),
    start: z.string(), end: z.string(), bullets: z.array(z.string()).default([]),
    note: z.string().optional(),
  })),
  stats_section: z.object({ show: z.boolean() }),
});

export type SiteConfig = z.infer<typeof schema>;
export function parseSiteConfig(yamlText: string): SiteConfig {
  return schema.parse(parse(yamlText));
}
export function getSiteConfig(): SiteConfig {
  return parseSiteConfig(fs.readFileSync(new URL('../data/site.yaml', import.meta.url), 'utf8'));
}
```

- [ ] **Step 3: Run tests** — `pnpm test` → Expected: PASS (2 tests).

- [ ] **Step 4: Write `src/data/site.yaml`** (content from PROFILE.md, public-safe):

```yaml
name: Riccardo Gabellone
headline: Software Engineer — Backend & Distributed Systems
availability:
  show: true
  label: Open to opportunities
tagline: >-
  Backend engineer who builds production microservices by day and ships
  privacy-first AI products solo by night.
about: >-
  Backend / distributed-systems engineer with 4+ years building Python and
  Rust microservices in production — 40+ services, hundreds of requests per
  second, thousands of users — where I grew from building individual services
  to owning all of the infrastructure and pipelines. On the side I ship
  complete products solo, most recently Vital Causality, a privacy-first
  health app running on-device LLM inference, live on Android in Europe.
socials:
  github: https://github.com/riccardogabellone
  linkedin: https://www.linkedin.com/in/riccardogabellone
  x: https://x.com/GabelloneRic
  telegram: https://t.me/riccardogabellone
  email: ing.riccardogabellone@gmail.com
cv_pdf: null   # set to /cv/riccardo-gabellone-cv.pdf when the sanitized PDF lands
skills:
  - group: Languages
    items: [Python, Rust, Kotlin, TypeScript, Dart, Bash]
  - group: Backend & APIs
    items: [FastAPI, gRPC, REST, API design, unit & integration testing]
  - group: Infrastructure & DevOps
    items: [AWS, Terraform, Docker, Kubernetes, CI/CD pipelines]
  - group: Data & Messaging
    items: [PostgreSQL, RabbitMQ, Kafka / Redpanda, Redis, Memgraph]
  - group: Frontend & Mobile
    items: [Android, Flutter, React]
timeline:
  - kind: work
    title: Software Engineer
    org: Boring Stuff S.r.l.
    org_url: https://www.boringstuff.xyz/
    start: 09/2022
    end: 04/2026
    bullets:
      - Designed microservices architectures end to end — from IaC (Terraform, AWS) to custom CI pipelines
      - Built backend services and internal libraries in Python (FastAPI) and Rust across 40+ services in production
      - Owned sync/async inter-service communication — gRPC, RabbitMQ, Kafka/Redpanda, Redis — and high-volume PostgreSQL
  - kind: education
    title: M.S. in Software Engineering
    org: Politecnico di Torino
    org_url: null
    start: "2018"
    end: "2022"
    bullets: []
    note: "Thesis: development of a mutant-injection tool as part of a gamified GUI-testing environment"
  - kind: education
    title: B.S. in Computer Engineering
    org: Politecnico di Torino
    org_url: null
    start: "2013"
    end: "2018"
    bullets: []
stats_section:
  show: true
```

- [ ] **Step 5: Write `src/data/projects.yaml`** (array form for the `file()` loader; descriptions from PROFILE.md §6–7 and the public-safe project blurbs):

```yaml
- id: vital-causality
  title: Vital Causality
  tagline: Privacy-first health diary with on-device AI
  description: >-
    Built entirely solo — idea, UX, Android app, backend, infrastructure. Health
    data is special-category under GDPR, so the app is offline-first: the AI that
    surfaces correlations between health events runs on-device with fine-tuned
    models and local LLM inference, so raw health data never leaves the phone.
    A remote-inference path handles heavier tasks with privacy designed in.
    Live in production in Europe.
  tech: [Kotlin, Android, On-device LLM, FastAPI, GCP]
  links: { live: "https://vitalcausality.app" }
  status: featured
  order: 1
- id: doomhole
  title: Doomhole
  tagline: Anti-doomscroll Android app with a physically-traced black hole
  description: >-
    Renders a Schwarzschild black hole (null-geodesic AGSL shader) as a growing
    accessibility overlay that swallows your feed the longer you scroll.
    Offline, privacy-first, MIT-licensed.
  tech: [Kotlin, AGSL shaders, Android accessibility]
  links: {}
  status: featured
  order: 2
- id: quiz-patente-nautica
  title: Quiz Patente Nautica
  tagline: Italian nautical-license exam trainer, shipped on Google Play
  description: >-
    Born from my own studying: designed, built, and published on Google Play in
    under a month.
  tech: [Kotlin, Android]
  links: {}
  status: featured
  order: 3
- id: photostacker
  title: photostacker
  tagline: Batch pipeline that stacks geometrically-identical photos
  description: >-
    Groups HDR/focus/burst shots via a three-stage funnel — EXIF bucketing,
    perceptual hashing, DINOv2 ONNX embeddings — and exports multi-layer
    PSD/TIFF. FastAPI + HTMX UI, ~30 tests.
  tech: [Python, ONNX, FastAPI, HTMX]
  links: {}
  status: listed
  order: 4
- id: hyperloglog
  title: hyperloglog
  tagline: From-scratch HyperLogLog cardinality estimator in Rust
  description: >-
    Generic, bias-corrected, mergeable. Zero dependencies, rustdoc with
    doctests, 18 tests, CI.
  tech: [Rust]
  links: {}
  status: listed
  order: 5
- id: gnammy
  title: Gnammy
  tagline: Full-stack migration of a community food-delivery platform
  description: >-
    Migrated a pandemic-era delivery platform serving my hometown to a new
    ecosystem — server provisioning, deploy scripts, Node.js API, React web,
    Flutter and native Android clients.
  tech: [Node.js, React, Flutter, Android]
  links: {}
  status: listed
  order: 6
```

- [ ] **Step 6: Write `src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: file('src/data/projects.yaml'),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    description: z.string(),
    tech: z.array(z.string()),
    links: z.object({
      live: z.string().url().optional(),
      playstore: z.string().url().optional(),
      repo: z.string().url().optional(),
    }),
    status: z.enum(['featured', 'listed', 'hidden']),
    order: z.number(),
  }),
});

export const collections = { projects };
```

- [ ] **Step 7: Verify** — `pnpm test && pnpm check && pnpm build` → all pass. Then temporarily break `site.yaml` (remove `name:`), run `pnpm build`, confirm it FAILS with a schema error, restore. Same for `projects.yaml` (set `status: bogus`) — build must fail. Restore.

- [ ] **Step 8: Commit** — `git add -A && git commit -m "feat: YAML content layer with schema validation (site + projects)"`

---

### Task 4: Stats pipeline — validator (TDD), fetch script, seed snapshot

**Files:**
- Create: `scripts/lib/validate-stats.mjs`, `scripts/fetch-stats.mjs`, `tests/validate-stats.test.mjs`, `src/data/github-stats.json` (seeded from a real fetch), `src/lib/stats.ts`
- Modify: `package.json` (`"build": "node scripts/fetch-stats.mjs && astro build"`)

**Interfaces:**
- Consumes: GAS endpoint (Global Constraints).
- Produces: `validateStats(raw: unknown): Stats` (throws on bad shape) in `scripts/lib/validate-stats.mjs`; `src/data/github-stats.json` shape `Stats & { fetchedAt: string }`; `getStats(): BakedStats` in `src/lib/stats.ts` for components. `Stats` fields: `userName, userBio, userAvatarUrl: string; commitsCount, ownedRepoCount, contributedReposCount, prCount, issuesCount, followers: number; languages: {name: string, percentage: number}[]; lastUpdated: string; contributionData: { years: {year: string, total: number}[], contributions: {date: string, intensity: string, count: number}[] }`.

- [ ] **Step 1: Write the failing test** — `tests/validate-stats.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStats } from '../scripts/lib/validate-stats.mjs';

const good = {
  userName: 'R', userBio: 'b', userAvatarUrl: 'https://a/x.png',
  commitsCount: 1, ownedRepoCount: 2, contributedReposCount: 3,
  prCount: 4, issuesCount: 5, followers: 6,
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
  const s = validateStats({ ...good, commitsCount: '1234', languages: [{ name: 'R', percentage: '60.5' }] });
  assert.equal(s.commitsCount, 1234);
  assert.equal(s.languages[0].percentage, 60.5);
});

test('rejects a GAS error payload', () => {
  assert.throws(() => validateStats({ error: 'boom' }));
});

test('rejects missing contributionData', () => {
  const { contributionData, ...rest } = good;
  assert.throws(() => validateStats(rest));
});
```

Run: `pnpm test` → Expected: FAIL (module not found).

- [ ] **Step 2: Implement `scripts/lib/validate-stats.mjs`** (plain JS, no zod — scripts stay dependency-light):

```js
const num = (v, field) => {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`stats: ${field} is not a number`);
  return n;
};
const str = (v, field) => {
  if (typeof v !== 'string' || v.length === 0) throw new Error(`stats: ${field} is not a string`);
  return v;
};

export function validateStats(raw) {
  if (raw === null || typeof raw !== 'object') throw new Error('stats: payload is not an object');
  if ('error' in raw) throw new Error(`stats: GAS returned error: ${raw.error}`);
  const cd = raw.contributionData;
  if (cd === null || typeof cd !== 'object') throw new Error('stats: contributionData missing');
  if (!Array.isArray(cd.years) || !Array.isArray(cd.contributions)) throw new Error('stats: contributionData malformed');
  return {
    userName: str(raw.userName, 'userName'),
    userBio: typeof raw.userBio === 'string' ? raw.userBio : '',
    userAvatarUrl: str(raw.userAvatarUrl, 'userAvatarUrl'),
    commitsCount: num(raw.commitsCount, 'commitsCount'),
    ownedRepoCount: num(raw.ownedRepoCount, 'ownedRepoCount'),
    contributedReposCount: num(raw.contributedReposCount, 'contributedReposCount'),
    prCount: num(raw.prCount, 'prCount'),
    issuesCount: num(raw.issuesCount, 'issuesCount'),
    followers: num(raw.followers, 'followers'),
    languages: (Array.isArray(raw.languages) ? raw.languages : []).map((l, i) => ({
      name: str(l.name, `languages[${i}].name`),
      percentage: num(l.percentage, `languages[${i}].percentage`),
    })),
    lastUpdated: str(raw.lastUpdated, 'lastUpdated'),
    contributionData: {
      years: cd.years.map((y, i) => ({ year: String(y.year), total: num(y.total, `years[${i}].total`) })),
      contributions: cd.contributions.map((c, i) => ({
        date: str(c.date, `contributions[${i}].date`),
        intensity: String(c.intensity ?? '0'),
        count: num(c.count ?? 0, `contributions[${i}].count`),
      })),
    },
  };
}
```

- [ ] **Step 3: Run tests** — `pnpm test` → Expected: PASS (all).

- [ ] **Step 4: Implement `scripts/fetch-stats.mjs`**

```js
import fs from 'node:fs';
import { validateStats } from './lib/validate-stats.mjs';

const URL_ = process.env.GAS_STATS_URL
  ?? 'https://script.google.com/macros/s/AKfycbyzbrUmB1JTP23S1Tl8bHnIf1JnV0MMCOzdEdpJmSrZ4BW-RPBQthAEs7ghze1y3u3BXQ/exec';
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
  try { stats = await attempt(); }
  catch (e) { console.warn(`fetch-stats: attempt ${i + 1} failed: ${e.message}`); }
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
```

(Exit 1 only when there is no fallback at all — that never happens once the seed is committed.)

- [ ] **Step 5: Seed the snapshot from the real GAS** — run `node scripts/fetch-stats.mjs`; confirm `src/data/github-stats.json` now holds real data (name "Riccardo Gabellone", plausible counts, contributions array). Then test the failure path: `GAS_STATS_URL=https://invalid.invalid node scripts/fetch-stats.mjs` → warns, exits 0, file unchanged.

- [ ] **Step 6: `src/lib/stats.ts`** — typed accessor for components:

```ts
import raw from '../data/github-stats.json';

export interface LanguageStat { name: string; percentage: number; }
export interface YearTotal { year: string; total: number; }
export interface DayContribution { date: string; intensity: string; count: number; }
export interface BakedStats {
  userName: string; userBio: string; userAvatarUrl: string;
  commitsCount: number; ownedRepoCount: number; contributedReposCount: number;
  prCount: number; issuesCount: number; followers: number;
  languages: LanguageStat[]; lastUpdated: string; fetchedAt: string;
  contributionData: { years: YearTotal[]; contributions: DayContribution[] };
}
export function getStats(): BakedStats { return raw as BakedStats; }
```

- [ ] **Step 7: Switch `package.json` build script** to `"build": "node scripts/fetch-stats.mjs && astro build"`; run `pnpm check && pnpm build` → passes.

- [ ] **Step 8: Commit** — `git add -A && git commit -m "feat: build-time GAS stats pipeline with validated fallback snapshot"`

---

### Task 5: Page skeleton — Hero, About, Contact, Footer, anchor nav

**Skills:** load `frontend-design` before starting (applies through Task 8).

**Files:**
- Create: `src/components/Hero.astro`, `src/components/Contact.astro`, `src/components/Footer.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getSiteConfig()` (Task 3), `getStats()` (Task 4), `Icon` (Task 2).
- Produces: page sections with ids `about`, `stats`, `projects`, `experience`, `skills`, `contact` (anchor targets used by nav and later tasks). Footer renders `<span data-stat="fetchedAt-label">` — the "stats as of" element updated by Task 9.

- [ ] **Step 1: `Hero.astro`** — avatar (`stats.userAvatarUrl`, `loading="eager"`, explicit width/height), name (h1), headline, availability badge (render only `if site.availability.show`; gold-bordered mono chip), tagline, social icon links (each `aria-label`ed, `rel="noopener noreferrer"`, `target="_blank"`), Download CV button (render only `if site.cv_pdf !== null`). Availability badge markup:

```astro
{site.availability.show && (
  <span class="chip hot" role="status">{site.availability.label}</span>
)}
```

- [ ] **Step 2: `Contact.astro`** — panel with `id="contact"`, heading "Get in touch", one-line invitation, gold CTA button `href={'mailto:' + site.socials.email}` with the `mail` icon, secondary links (LinkedIn, Telegram).

- [ ] **Step 3: `Footer.astro`**

```astro
---
import { getStats } from '../lib/stats';
const year = new Date().getFullYear();
const stats = getStats();
const asOf = new Date(stats.fetchedAt).toISOString().slice(0, 10);
---
<footer class="container">
  <hr class="lightbar" />
  <p>© {year} Riccardo Gabellone</p>
  <p class="mono"><span data-stat="fetchedAt-label">Stats as of {asOf}</span></p>
</footer>
```

- [ ] **Step 4: Assemble `index.astro`** — Base layout with `title="Riccardo Gabellone — Software Engineer"`, `description={site.tagline}`; sticky top nav (mono, anchor links About / Stats / Projects / Experience / Skills / Contact); Hero; lightbar; `<section id="about" class="panel">` with `.section-title` "About" and `site.about`; placeholder empty sections with the remaining ids (filled by Tasks 6–8); Contact; Footer.

- [ ] **Step 5: Verify** — `pnpm check && pnpm build && pnpm dev`; Chrome DevTools MCP: screenshot at 390px and 1280px widths; confirm hero reads well on both, nav anchors scroll, no console errors, availability badge visible, no CV button (cv_pdf is null).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: hero, about, contact, footer, anchor nav"`

---

### Task 6: GitHub stats — StatTiles + LanguageBars

**Skills:** `dataviz` (read before writing the bars — they are a chart), `frontend-design`.

**Files:**
- Create: `src/components/StatTiles.astro`, `src/components/LanguageBars.astro`
- Modify: `src/pages/index.astro` (fill `#stats` section; render only `if site.stats_section.show`)

**Interfaces:**
- Consumes: `getStats()`.
- Produces: each stat number element carries `data-stat="<field>"` — exactly: `commitsCount`, `ownedRepoCount`, `contributedReposCount`, `prCount`, `issuesCount`, `followers` (Task 9 updates them by these names).

- [ ] **Step 1: `StatTiles.astro`** — grid of 6 tiles (2 cols mobile / 3 desktop): number (mono, gold, `toLocaleString('en-US')`) + label (Total Commits, Owned Repos, Contributed Repos, Pull Requests, Issues, Followers):

```astro
---
import { getStats } from '../lib/stats';
const s = getStats();
const tiles = [
  ['commitsCount', 'Total Commits', s.commitsCount],
  ['ownedRepoCount', 'Owned Repos', s.ownedRepoCount],
  ['contributedReposCount', 'Contributed Repos', s.contributedReposCount],
  ['prCount', 'Pull Requests', s.prCount],
  ['issuesCount', 'Issues', s.issuesCount],
  ['followers', 'Followers', s.followers],
] as const;
---
<div class="tiles">
  {tiles.map(([key, label, value]) => (
    <div class="tile">
      <div class="value mono" data-stat={key}>{value.toLocaleString('en-US')}</div>
      <div class="label">{label}</div>
    </div>
  ))}
</div>
<style>
  .tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
  @media (min-width: 720px) { .tiles { grid-template-columns: repeat(3, 1fr); } }
  .tile { background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--radius); padding: 1rem; text-align: center; }
  .value { font-size: 1.75rem; font-weight: 700; color: var(--gold); }
  .label { font-size: 0.85rem; color: var(--muted); }
</style>
```

- [ ] **Step 2: `LanguageBars.astro`** — per dataviz guidance: one hue (gold) since it's a single series; label + percentage in a flex row, track `var(--panel-2)`, fill `var(--gold)` width `${percentage}%`; bars carry `role="img"` with `aria-label` like "Rust 61.2 percent". Percentages rendered `toFixed(1)`. No animation (static widths — correct without JS).

- [ ] **Step 3: Fill the `#stats` section** — `.section-title` "GitHub Statistics", StatTiles, subheading "Language breakdown (latest 1k commits)", LanguageBars. Leave a `<div id="contrib-slot"></div>` marker where Task 8 inserts the calendar.

- [ ] **Step 4: Verify** — `pnpm check && pnpm build`; DevTools screenshot both widths; numbers match `src/data/github-stats.json` values exactly.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: baked stat tiles and language bars"`

---

### Task 7: Projects, Timeline, Skills sections

**Skills:** `frontend-design`.

**Files:**
- Create: `src/components/ProjectCard.astro`, `src/components/Timeline.astro`, `src/components/SkillChips.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getCollection('projects')` (Task 3), `getSiteConfig()`, `Icon`.

- [ ] **Step 1: Projects section** — in `index.astro`:

```astro
---
import { getCollection } from 'astro:content';
const projects = (await getCollection('projects'))
  .filter((p) => p.data.status !== 'hidden')
  .sort((a, b) => a.data.order - b.data.order);
---
```

Grid: `featured` cards span wider (first featured = flagship, full row); `listed` cards in a denser grid below. `ProjectCard.astro` props: `{ project: CollectionEntry<'projects'>; flagship?: boolean }`. Card: title (h3), tagline (gold), description, tech chips (mono), links row — `live` → "Visit" with `external-link` icon, `playstore` → "Play Store", `repo` → "Source" with `github` icon; when `links` is empty render `<span class="chip">source soon</span>`.

- [ ] **Step 2: `Timeline.astro`** — vertical line + markers (briefcase / graduation-cap icons by `kind`), entries from `site.timeline`: title, org (linked when `org_url` non-null), `start — end` in mono, bullets list, optional `note` in muted small text. Marker/line colors: gold markers, `var(--line)` rail.

- [ ] **Step 3: `SkillChips.astro`** — groups from `site.skills`: group label (blue, mono, `// `-prefixed via `.section-title.alt` style at smaller size), chips row. Mark these exact items as `.hot` (headline skills, max 5 per CV rule): `Python`, `Rust`, `FastAPI`, `Kubernetes`, `PostgreSQL`.

- [ ] **Step 4: Fill sections in `index.astro`** — `#projects` ("Featured Projects"), `#experience` ("Experience & Education"), `#skills` ("Skills & Tech Stack", `.alt` blue variant title).

- [ ] **Step 5: Verify** — `pnpm check && pnpm build`; DevTools screenshots; check: flagship card visually dominant, "source soon" chips on Doomhole/QPN/photostacker/hyperloglog/Gnammy, timeline shows `09/2022 — 04/2026` (NOT "Present"), 5 hot chips total.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: projects grid, experience timeline, skill chips"`

---

### Task 8: Contribution calendar — static grid + pan/zoom + year chips

**Skills:** `dataviz` (calendar is a heatmap — read before styling the ramp), `frontend-design`.

**Files:**
- Create: `src/lib/contrib.ts`, `tests/contrib.test.mjs`, `src/components/ContribCalendar.astro`, `src/scripts/calendar.ts`
- Modify: `src/pages/index.astro` (replace `#contrib-slot` marker with the component)

**Interfaces:**
- Consumes: `getStats().contributionData`.
- Produces: `buildYearGrid(year: string, contributions: DayContribution[]): { cells: { date: string; intensity: number; count: number }[]; leadingBlanks: number }`; `clampTranslate(x, y, scale, viewW, viewH, gridW, gridH): { x: number; y: number }`; `RAMP: string[]` (5 colors). Client re-render contract: `window.addEventListener('stats:refresh', (e) => ...)` with `detail` = fresh Stats (Task 9 dispatches it). JSON data embedded as `<script type="application/json" id="contrib-data">`.

- [ ] **Step 1: Write failing tests** — `tests/contrib.test.mjs`:

```js
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

test('days without contributions are intensity 0', () => {
  const g = buildYearGrid('2026', []);
  assert.ok(g.cells.every((c) => c.intensity === 0));
});

test('ramp has 5 steps', () => { assert.equal(RAMP.length, 5); });

test('clamp centers a grid smaller than the viewport', () => {
  const { x } = clampTranslate(-50, 0, 1, 800, 115, 400, 100);
  assert.ok(x >= 0 && x <= 400);
});

test('clamp bounds a grid larger than the viewport', () => {
  const { x } = clampTranslate(-9999, 0, 1, 800, 115, 2000, 100);
  assert.equal(x, 800 - 2000);
});
```

Run: `pnpm test` → FAIL (module not found).

- [ ] **Step 2: Implement `src/lib/contrib.ts`** (pure; UTC date math to avoid TZ bugs):

```ts
import type { DayContribution } from './stats';

export const RAMP = ['#1a2430', '#453722', '#7a5a24', '#b07e28', '#e8a93c'];

export function buildYearGrid(year: string, contributions: DayContribution[]) {
  const y = Number(year);
  const map = new Map(
    contributions
      .filter((c) => c.date.startsWith(year))
      .map((c) => [c.date.slice(0, 10), c]),
  );
  const start = new Date(Date.UTC(y, 0, 1));
  const end = new Date(Date.UTC(y, 11, 31));
  const leadingBlanks = start.getUTCDay();
  const cells: { date: string; intensity: number; count: number }[] = [];
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
  x: number, y: number, scale: number,
  viewW: number, viewH: number, gridW: number, gridH: number,
) {
  const sw = gridW * scale, sh = gridH * scale;
  const cx = sw <= viewW ? Math.max(0, Math.min(x, viewW - sw)) : Math.max(viewW - sw, Math.min(x, 0));
  const cy = sh <= viewH ? Math.max(0, Math.min(y, viewH - sh)) : Math.max(viewH - sh, Math.min(y, 0));
  return { x: cx, y: cy };
}
```

- [ ] **Step 3: Run tests** — `pnpm test` → PASS.

- [ ] **Step 4: `ContribCalendar.astro`** — server-renders the LATEST year grid as real DOM (no-JS complete): 7-row CSS grid of 12×12px cells colored `RAMP[intensity]`, each cell `title="{date}: {count}"`; year chips row — buttons (mono chips; latest year `.selected` gold) + a non-interactive "Total: N" chip; wrapper `role="img"` `aria-label="GitHub contribution calendar, {total} contributions in {year}"`. Embed the full contributionData for the client:

```astro
<script type="application/json" id="contrib-data" set:html={JSON.stringify(stats.contributionData)}></script>
<script src="../scripts/calendar.ts"></script>
```

- [ ] **Step 5: `src/scripts/calendar.ts`** — progressive enhancement on the server-rendered DOM:
  - Reads `#contrib-data` JSON; re-renders the grid for a year on chip click (rebuild cells via `buildYearGrid` imported from `../lib/contrib`); updates `.selected` chip state and the wrapper `aria-label`.
  - Pan/zoom on **Pointer Events only** (`pointerdown/move/up/cancel` + `setPointerCapture`), wheel zoom toward cursor (scale 0.5–4), two-pointer pinch (track active pointers in a `Map`, zoom by distance ratio toward the midpoint), all translations clamped via `clampTranslate`. `touch-action: none` on the viewport; `cursor: grab/grabbing`.
  - Initial state: fit-to-viewport (scale = min(viewW/gridW, viewH/gridH, 1), centered) via `requestAnimationFrame` after render; refit on `resize` (debounced 150ms).
  - Listens for `stats:refresh` (CustomEvent with fresh Stats in `detail`): replaces the embedded data in memory, re-renders current year, updates chips.
  - Guard clause: if `#contrib-data` is missing or parse fails, return silently (static grid stays).

- [ ] **Step 6: Verify** — `pnpm check && pnpm build && pnpm test`; DevTools: grid renders statically (disable JS via emulation → grid still visible); with JS: drag pans, wheel zooms toward cursor, chips switch years, no console errors. Screenshot.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: contribution calendar — static render + pointer pan/zoom + year chips"`

---

### Task 9: Client revalidation (stale-while-revalidate)

**Files:**
- Create: `src/scripts/revalidate.ts`, `tests/revalidate.test.mjs`, `src/lib/revalidate-core.ts`
- Modify: `src/pages/index.astro` (add `<script src="../scripts/revalidate.ts"></script>` when `site.stats_section.show`)

**Interfaces:**
- Consumes: `data-stat` elements (Task 6), `data-stat="fetchedAt-label"` (Task 5), `stats:refresh` listener (Task 8), `validateStats` logic shape.
- Produces: `shouldRefresh(bakedFetchedAt: string, remoteLastUpdated: string): boolean` in `src/lib/revalidate-core.ts`.

- [ ] **Step 1: Failing test** — `tests/revalidate.test.mjs`:

```js
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
});
```

Run → FAIL; implement `src/lib/revalidate-core.ts`:

```ts
export function shouldRefresh(bakedFetchedAt: string, remoteLastUpdated: string): boolean {
  const a = Date.parse(bakedFetchedAt);
  const b = Date.parse(remoteLastUpdated);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return b > a;
}
```

Run → PASS.

- [ ] **Step 2: `src/scripts/revalidate.ts`** — on `load` (not blocking): `fetch(GAS_URL)` (same constant, imported from a tiny `src/lib/config.ts` exporting `GAS_STATS_URL` — create it and also import it in `scripts/fetch-stats.mjs`... scripts/ runs outside Vite: instead duplicate the constant here and add a comment naming the twin in `scripts/fetch-stats.mjs`); parse JSON; bail silently on any error or non-object; read baked `fetchedAt` from `document.querySelector('[data-stat="fetchedAt-label"]')?.getAttribute('data-fetched-at')` (add that attribute in Footer, Task 5 — set `data-fetched-at={stats.fetchedAt}`); if `shouldRefresh(...)`: update each `[data-stat]` element whose key exists in the payload with `Number(...).toLocaleString('en-US')`, set label text to `Stats as of ${new Date(payload.lastUpdated).toISOString().slice(0,10)} (live)`, and `window.dispatchEvent(new CustomEvent('stats:refresh', { detail: payload }))`. Everything wrapped in `try { ... } catch { /* baked data stands */ }`.
  - Also modify Footer (Task 5 file) to add the `data-fetched-at` attribute now.

- [ ] **Step 3: Verify** — `pnpm test && pnpm check && pnpm build`; DevTools: throttle/block the GAS request → page unaffected, console clean; allow it → label may flip to "(live)" if the sheet is newer.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: background stats revalidation (SWR)"`

---

### Task 10: Quality sweep — contrast, a11y, perf, no-JS

**Skills:** `web-perf`, `chrome-devtools-mcp:chrome-devtools`, `chrome-devtools-mcp:a11y-debugging`, `superpowers:verification-before-completion`.

**Files:**
- Create: `scripts/check-contrast.mjs`
- Modify: whatever the sweep flags.

- [ ] **Step 1: `scripts/check-contrast.mjs`** — WCAG math, hard assertions on the real token pairs:

```js
const L = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => (Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05);
const checks = [
  // [fg, bg, min, label]
  ['#e8edf3', '#0d141c', 4.5, 'text on bg'],
  ['#b9c4d0', '#0d141c', 4.5, 'body on bg'],
  ['#b9c4d0', '#16202c', 4.5, 'body on panel'],
  ['#8593a1', '#16202c', 4.5, 'muted on panel'],
  ['#e29b2d', '#0d141c', 4.5, 'gold on bg'],
  ['#e29b2d', '#16202c', 4.5, 'gold on panel'],
  ['#e29b2d', '#1d2937', 4.5, 'gold on panel-2 (stat tiles)'],
  ['#64a4e0', '#0d141c', 4.5, 'blue on bg'],
  ['#64a4e0', '#16202c', 4.5, 'blue on panel'],
];
let fail = 0;
for (const [fg, bg, min, label] of checks) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${r.toFixed(2)} (min ${min})`);
}
process.exit(fail ? 1 : 0);
```

Run: `node scripts/check-contrast.mjs` → all PASS. If any pair fails, adjust the token in `tokens.css` (lighten fg) until it passes, and update this script's values to match — script and tokens must agree.

- [ ] **Step 2: A11y pass** (a11y-debugging skill): landmarks (`header/nav/main/footer`), single h1, heading order, every icon-link `aria-label`ed, chips-as-buttons are real `<button>`s, tab through the page — focus visible everywhere, calendar chips reachable and Enter-activatable.

- [ ] **Step 3: Perf pass** (web-perf skill): DevTools Lighthouse audit on `pnpm preview` build — target ≥95 Performance / Accessibility / Best Practices / SEO. Check: fonts preloaded (no FOUT flash), no layout shift from avatar (explicit dimensions), total JS < 30KB. Fix what falls short.

- [ ] **Step 4: No-JS + reduced-motion + mobile** — DevTools: disable JS → full content visible including latest-year calendar; emulate `prefers-reduced-motion: reduce` → no smooth-scroll/transitions; 390px width screenshot → nothing overflows horizontally.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "chore: contrast validator + a11y/perf/no-js sweep fixes"`

---

### Task 11: Deploy workflow, README, Jekyll removal

**Files:**
- Create: `.github/workflows/deploy.yml`
- Delete: `_config.yml`
- Modify: `README.md`

- [ ] **Step 1: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  schedule:
    - cron: '17 5 * * *'   # daily stats refresh
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Install, build (fetch-stats runs via the build script), upload
        uses: withastro/action@v6

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5

  verify-pem:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Tesla PEM must be byte-identical in production
        run: |
          curl -fsSL --retry 3 --retry-delay 5 \
            https://riccardogabellone.github.io/.well-known/appspecific/com.tesla.3p.public-key.pem \
            -o live.pem
          cmp public/.well-known/appspecific/com.tesla.3p.public-key.pem live.pem
          echo "PEM verified byte-identical"

  refresh-snapshot:
    if: github.event_name == 'schedule'
    needs: deploy
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        with: { node-version: 24 }
      - name: Refresh committed last-good snapshot
        run: |
          node scripts/fetch-stats.mjs
          if ! git diff --quiet -- src/data/github-stats.json; then
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git add src/data/github-stats.json
            git commit -m "chore: refresh stats snapshot [skip ci]"
            git push
          fi
```

If `actions/setup-node@v6` does not exist yet, use the latest major shown at https://github.com/actions/setup-node.

- [ ] **Step 2: Delete `_config.yml`** (`git rm _config.yml`) — Actions deploys bypass Jekyll entirely.

- [ ] **Step 3: Rewrite `README.md`** — what the site is, stack (Astro 7, pnpm, YAML content), how to run (`corepack enable pnpm && pnpm i && pnpm dev`), how content editing works (site.yaml / projects.yaml, `status:` + `links:` toggles, `cv_pdf`), the stats pipeline (GAS → build bake → daily cron → SWR), and a loud section: **the PEM at `public/.well-known/appspecific/` must never be modified — CI verifies byte-identity after every deploy**.

- [ ] **Step 4: Verify locally** — `pnpm check && pnpm build && pnpm test && node scripts/check-contrast.mjs` → all green. `actionlint` if available (skip if not installed).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: Pages deploy workflow with PEM verification and daily stats refresh; drop Jekyll"`

---

### Task 12: Review, PR, merge, Pages source flip, live verification

**Skills:** `superpowers:requesting-code-review`, then `security-review` on the branch diff, then `superpowers:finishing-a-development-branch`.

- [ ] **Step 1: Full local gate** — `pnpm test && pnpm check && pnpm build && node scripts/check-contrast.mjs`; hash check on `dist/` PEM equals the Global Constraints invariant.

- [ ] **Step 2: Request code review** (requesting-code-review skill) on the branch diff vs main; address findings.

- [ ] **Step 3: Security review** — run the `security-review` skill; expected focus: no secrets in repo (GAS URL is intentionally public), workflow permissions minimal, no phone/salary/NDA content in YAML.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin refactor/astro-portfolio
gh pr create --title "Rebuild portfolio on Astro 7 (CV design system, baked stats, PEM CI guard)" --body "See docs/superpowers/specs/2026-08-04-portfolio-refactor-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 5: Flip Pages to workflow deploys** — BEFORE merging (the old Jekyll deploy stays live until the first Actions deploy replaces it):

```bash
gh api -X PUT repos/riccardogabellone/riccardogabellone.github.io/pages -f build_type=workflow
```

If the API rejects it, do it in the UI: Settings → Pages → Source → GitHub Actions. Confirm with `gh api repos/riccardogabellone/riccardogabellone.github.io/pages --jq .build_type` → `workflow`.

- [ ] **Step 6: Merge the PR** (user confirms), watch the run: `gh run watch` — all four jobs green, including `verify-pem`.

- [ ] **Step 7: Live verification**

```bash
curl -fsSL https://riccardogabellone.github.io/.well-known/appspecific/com.tesla.3p.public-key.pem | sha256sum
# must print 968674d7fa9426c7e78d5cf7fcc81d4c3d7fd15f496dff64c03a916ca5c3d93d
```

Open https://riccardogabellone.github.io in DevTools: content on first paint (no loading dots), Lighthouse ≥95s, console clean. Confirm og tags with a share-preview check.

- [ ] **Step 8: Close out** — finishing-a-development-branch skill (branch cleanup); report remaining manual steps to Riccardo: sanitized CV PDF → `public/cv/riccardo-gabellone-cv.pdf` + set `cv_pdf` in site.yaml; Play Store URLs for Vital Causality + Quiz Patente Nautica → `links:` in projects.yaml; `repo:` links as repos go public.

---

## Self-review notes (completed)

- **Spec coverage:** goals 1–6 map to Tasks 5–8 (content/SEO first paint), 2 (design system), 3+5–7 (CV content), 4+9+11 (stats pipeline), 1+11+12 (PEM), 3 (YAML). Non-goals respected (no GAS edits, no extra hosting).
- **Known deviation from spec:** fonts live in `src/assets/fonts/` (stable Astro Fonts API) instead of `public/fonts/` — same self-hosting intent, official mechanism, better preloading. Spec's `public/fonts/` line is superseded.
- **Type consistency:** `data-stat` keys (Tasks 6/9) match `Stats` field names (Task 4); `stats:refresh` event produced in Task 9, consumed in Task 8; `buildYearGrid`/`clampTranslate`/`RAMP` defined Task 8 Step 2, used in Steps 4–5; `getSiteConfig`/`getStats` defined Tasks 3/4, consumed Tasks 5–9.
