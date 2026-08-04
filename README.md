# riccardogabellone.github.io

Personal portfolio — [riccardogabellone.github.io](https://riccardogabellone.github.io). Static [Astro](https://astro.build) site styled with the CV design system (dark navy, gold/blue dual accents, Space Grotesk / Inter / JetBrains Mono, self-hosted fonts). No UI framework, no Tailwind — token-driven vanilla CSS, two small vanilla TS scripts (contribution-calendar pan/zoom, background stats revalidation).

## ⚠️ Tesla public key — do not touch

`public/.well-known/appspecific/com.tesla.3p.public-key.pem` is the Tesla Fleet API partner key served at
`https://riccardogabellone.github.io/.well-known/appspecific/com.tesla.3p.public-key.pem`.
**Its bytes must never change.** The file is `-text` in `.gitattributes` (no EOL conversion on any platform); the canonical bytes are the LF blob — git blob `0a265e047e226f018d5b74735f6ce1f91aa58dd9`, sha256 `b08bdf5543c6fbd5deb23e504b5fdba62b038238656156edcde1946264d3a525`. The deploy workflow's `verify-pem` job asserts the repo copy still hashes to that blob AND curls the live URL after every deploy, failing loudly on any drift.

## Develop

```bash
corepack enable pnpm   # or: npm i -g pnpm
pnpm install
pnpm dev               # daemonized; astro dev stop / status / logs
pnpm test              # node --test (validators, calendar math, SWR logic)
pnpm check             # astro check
pnpm build             # fetches GAS stats, then astro build
node scripts/check-contrast.mjs   # WCAG AA gate for the design tokens
```

## Content editing — YAML is the control panel

| File | Controls |
|---|---|
| `src/data/site.yaml` | name, headline, availability badge (`availability.show`), tagline/about, socials, skills groups, experience timeline, `cv_pdf` (path or `null` hides the button), `stats_section.show` |
| `src/data/projects.yaml` | project cards: `status: featured \| listed \| hidden`, `order`, `links.live / playstore / repo` (no links ⇒ "source soon" chip) |

Both files are schema-validated at build — a typo fails the build instead of silently breaking the page. To publish a repo later, add one `repo:` line and push.

## GitHub stats pipeline

The Google Apps Script web app (backed by a Google Sheet) remains the single source of truth:

1. **Build time** — `scripts/fetch-stats.mjs` fetches GAS (timeout + retries), validates and slims the payload, writes `src/data/github-stats.json`; the page renders stat tiles, language bars, and the contribution calendar statically. GAS failures fall back to the committed snapshot and never break a deploy.
2. **Daily cron** (`17 5 * * *`) rebuilds the site and commits a refreshed snapshot when data changed.
3. **In the browser** — a ~1 KB script revalidates against GAS after load and patches numbers in place if the sheet is newer ("Stats as of … (live)").

## Deploy

GitHub Actions → GitHub Pages (`withastro/action` → `actions/deploy-pages`). Pages source is "GitHub Actions" — there is no Jekyll step, so `.well-known/` is served as-is from `public/`.
