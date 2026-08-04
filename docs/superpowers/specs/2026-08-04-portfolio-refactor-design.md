# Portfolio Refactor — Design

**Date:** 2026-08-04 · **Status:** Approved by Riccardo · **Repo:** riccardogabellone.github.io

## Context

The current site is a single hand-written `index.html` (Tailwind Play CDN, Google Fonts CDN, Material Symbols CDN). Every piece of content — name, bio, avatar, GitHub stats, contribution calendar, language bars — is fetched client-side on page load from a Google Apps Script (GAS) web app backed by a Google Sheet. Result: seconds of "..." placeholders on first paint (GAS cold starts), an SEO-empty page, and a broken page without JS. The experience section is outdated (says "Boring Stuff | 2022 – Present"; Riccardo left 04/2026 and is actively job-hunting). The repo also serves the Tesla Fleet API public key at `/.well-known/appspecific/com.tesla.3p.public-key.pem`, currently published only because `_config.yml` tells GitHub Pages' Jekyll build to include `.well-known/`.

Primary audience: recruiters and hiring managers during the active job search (the site is linked from the CV).

## Goals

1. Modern, fast, SEO-complete site: full content in static HTML on first paint.
2. One coherent personal brand: the site adopts the CV's design system, adapted to dark.
3. Content updated from `cv_resumee` materials (PROFILE.md narrative, corrected timeline).
4. GitHub stats stay sourced from the GAS endpoint but become instantly available (baked at build) with background freshness.
5. Tesla PEM served byte-identical at the exact same URL, with a deploy-time guarantee.
6. Content maintainable from YAML files without touching templates.

## Non-goals / out of scope

- Modifying the GAS script (lives in Riccardo's Google account). Optional later: add `CacheService` caching inside it for snappier revalidation.
- Publishing the not-yet-public repos (hyperloglog, Doomhole, photostacker…); the site is ready for them via YAML toggles.
- Blog, multi-page content, CMS, analytics, custom domain.
- Edge/serverless caching layers (rejected as YAGNI — scheduled rebuilds suffice).

## Decisions log

| Decision | Choice |
|---|---|
| Framework | Astro 7 (7.1.x current at design time; latest 7.x at implementation), static output |
| Styling | Vanilla CSS with CV design tokens; no Tailwind (Play CDN removed) |
| Visual direction | CV design system (`cv.html`) adapted to a dark theme |
| Professional status | Corrected timeline (Boring Stuff 09/2022 – 04/2026) + visible "Open to opportunities" badge |
| Projects section | Data-driven from `projects.yaml`; launch with linkable products + "source soon" cards |
| CV download | Yes — sanitized PDF variant (no phone number), manually dropped into `public/cv/` |
| GitHub stats | Baked at build from GAS; daily cron rebuild; committed last-good fallback; client background revalidation |
| Package manager | pnpm; Node 24 (withastro/action default) |
| Hosting | GitHub Pages via Actions (`withastro/action@v6` + `actions/deploy-pages`); Jekyll and `_config.yml` removed |

## Architecture

```
├── astro.config.mjs               # site: 'https://riccardogabellone.github.io'
├── package.json + pnpm-lock.yaml
├── public/
│   ├── .well-known/appspecific/com.tesla.3p.public-key.pem   # git mv, bytes untouched
│   ├── cv/riccardo-gabellone-cv.pdf                          # sanitized variant (user-provided)
│   ├── fonts/                     # self-hosted woff2 from cv_resumee fontsource packages
│   └── favicon.png (+ derived icons)
├── src/
│   ├── data/
│   │   ├── site.yaml              # identity, socials, availability, skills, timeline, toggles
│   │   ├── projects.yaml          # featured projects
│   │   └── github-stats.json      # committed last-good GAS snapshot (+ fetchedAt)
│   ├── components/                # Hero, StatTiles, ContribCalendar (island), LanguageBars,
│   │                              # ProjectCard, Timeline, SkillChips, Contact, Footer
│   ├── layouts/Base.astro         # meta, OG, canonical, fonts preload, tokens
│   ├── pages/index.astro          # single page, anchor nav
│   └── styles/tokens.css, global.css
├── scripts/fetch-stats.mjs        # build-time GAS fetch (timeout, 2 retries, schema check)
└── .github/workflows/deploy.yml   # push + daily cron + manual dispatch; build → deploy → verify
```

Only interactive JS on the page: the contribution-calendar island (pan/zoom, year chips) and the ~1 KB revalidation script. Everything else ships as static HTML/CSS.

## GitHub-stats data flow

1. **Build:** `fetch-stats.mjs` runs prebuild. Fetches the GAS URL (config value, not a secret — it is already public in the page source) with a timeout and 2 retries, validates the JSON shape, writes `src/data/github-stats.json` with a `fetchedAt` timestamp. Astro renders stat tiles, language bars, and the calendar statically from it.
2. **Freshness:** workflow triggers: push to main, daily cron (`17 5 * * *` — off-peak minute), manual dispatch. On scheduled runs, if the fetched snapshot differs from the committed one, the workflow commits it back (`[skip ci]`, github-actions bot author) so the fallback never rots.
3. **Failure mode:** any GAS failure at build → warning + build proceeds with the committed last-good snapshot. GAS can never break or block a deploy.
4. **Client revalidation (progressive enhancement):** after load, fetch GAS in the background; if `lastUpdated` is newer than the baked `fetchedAt`, update stat numbers, calendar data, and the "stats as of …" label in place. With JS disabled the page is complete and correct, just up to a day older.

## Content model

YAML data collections validated with schemas at build (Astro content collections); invalid content hard-fails the build.

**`site.yaml`:** name; headline "Software Engineer — Backend & Distributed Systems"; `availability: { show, label }` (launch: `show: true`, "Open to opportunities"); elevator-pitch tagline and short about text (from PROFILE.md, public-safe); socials (GitHub, LinkedIn, X, Telegram, email); `cv_pdf` path (null hides the button); grouped skills (Languages / Backend & APIs / Infrastructure & DevOps / Data & Messaging / Frontend & Mobile); timeline entries — Boring Stuff, Software Engineer, 09/2022 – 04/2026, with 2–3 highlight bullets (40+ microservices, Python/Rust services and internal libraries, IaC/CI ownership); M.S. Software Engineering, Politecnico di Torino, 2018–2022 (thesis: mutant-injection tool in a gamified GUI-testing environment); B.S. Computer Engineering, Politecnico di Torino, 2013–2018; `stats_section.show` toggle.

**`projects.yaml`:** entries with `id, title, tagline, description, tech[], links { live?, playstore?, repo? }, status: featured|listed|hidden, order`. Launch lineup:

| Project | Links | Status |
|---|---|---|
| Vital Causality (flagship: privacy-first, on-device AI story) | vitalcausality.app (+ Play Store if provided) | featured |
| Quiz Patente Nautica | Play Store | featured |
| Doomhole | — "source soon" | featured |
| photostacker | — "source soon" | listed |
| hyperloglog | — "source soon" | listed |
| Gnammy | — (story only) | listed |

Cards without links render a "source coming soon" treatment; adding a published repo later = one YAML line.

**Privacy rule:** the site carries only public-safe content. Never: phone number, salary data, NDA/employer repo names, or anything from PORTFOLIO.md's private inventory beyond the projects listed above.

## Page structure & visual language

Single page, anchor nav: Hero (name, headline, availability badge, socials, Download CV) → About → GitHub Stats (tiles + calendar + languages + "stats as of…") → Featured Projects (flagship card larger) → Experience & Education (timeline) → Skills (grouped chips) → Contact CTA → Footer.

Dark adaptation of the CV tokens (`cv.html` is the reference):

- Background: deep navy derived from `--ink #16202C` (darkened), panels one step lighter; light-gray body text.
- Accents: gold `#B06E08` (primary emphasis: `//` prefixes in main content, hot chips, stat numbers) and blue `#2A6CB0` (structural/secondary: links, sidebar-role elements) — both lightened for dark backgrounds; every text/background pair must pass WCAG AA, validated with a contrast checker during implementation. Exact dark values are an implementation concern; the AA constraint and the two-accent geography are requirements.
- Signature elements: `//` section-title motif; gold → ink → blue lightbar gradient under the hero; JetBrains Mono for machine text (dates, chips, stats, links); Space Grotesk display; Inter body. Fonts self-hosted woff2, preloaded; no Google Fonts CDN.
- Icons: inline Lucide SVGs (stroke, currentColor), as in the CV. No icon-font CDN (Material Symbols removed).
- Contribution calendar: brand intensity ramp (navy → gold) replacing Dracula; pan/zoom rewritten on Pointer Events; keyboard-accessible year chips; `prefers-reduced-motion` respected; visible focus styles.

## Tesla PEM & deployment

- `git mv` of the PEM into `public/.well-known/appspecific/` — content never touched. Astro copies `public/` verbatim into `dist/`.
- Deploy workflow: `actions/checkout` + `withastro/action@v6` (build + artifact upload) + `actions/deploy-pages`. Repo Pages source flips from "deploy from branch" to "GitHub Actions" (one-time, via `gh api`, done at first deploy).
- **Post-deploy verification job:** curl `https://riccardogabellone.github.io/.well-known/appspecific/com.tesla.3p.public-key.pem`, byte-compare (hash) with the repo file; fail the workflow on mismatch or non-200. This also covers any artifact/dotfile-handling regressions.
- `_config.yml` and Jekyll assumptions removed; README updated to describe the new stack.

## Error handling

- Content/schema/type errors (`astro check`, collection schemas): hard build failure.
- GAS fetch errors: never fatal (fallback snapshot, see data flow).
- Calendar island: guards missing/partial data (renders nothing gracefully rather than erroring); revalidation failures are silently ignored.

## Testing & definition of done

- CI: `astro check` + `astro build` gate every push; post-deploy PEM byte-identity check.
- Local verification before completion: real-browser pass (Chrome DevTools MCP) — visual inspection at mobile/desktop widths, clean console, Lighthouse ≥ 95 in all categories, page renders complete with JS disabled.
- Done when: deployed site shows full content on first paint with real baked stats; PEM check green; old URL space intact (single page at `/`); all hard constraints above hold.

## Manual steps for Riccardo

1. Provide the sanitized CV PDF (render via `cv_resumee/build.py` variant without phone) → `public/cv/`.
2. Provide the Vital Causality Play Store URL (and Doomhole's, if/when published).
3. Later, as repos go public: add `repo:` links in `projects.yaml`.
