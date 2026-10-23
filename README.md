# OpenKitty — personal fork

A password-protected fork of [Ishak-ctrl-ui/openkitty](https://github.com/Ishak-ctrl-ui/openkitty), a Next.js app for exploring public App Store information.

**Free data only:** real US iOS Top Grossing charts from Apple, daily rank observations, and a transparent competitor-research shortlist. The homepage covers the overall top 100 plus Productivity, Health & Fitness, Utilities, Photo & Video, Education, Lifestyle, Business and Finance. Country, source publication time and collection time are shown. Android and other storefronts are not covered.

The first snapshot is the baseline. Daily, 7-day and 30-day movements compare the same chart on exact UTC dates. Missing dates stay missing; an entrant means absent from the previous observed top 100, not a newly launched app. An unchanged provider publication timestamp is not counted as a fresh rank comparison. Each day's first successful observation is immutable. History retains 90 calendar days.

The shortlist includes grossing apps originally released within three years **or** with at most 25,000 US ratings, excluding a maintained list of known major publisher prefixes. It is ordered by release date, then rating count. Missing metadata does not qualify. Rating count is only an audience-footprint proxy; this does not verify a small team, easy competition, revenue, profit or business viability. Research pricing, reviews and unmet needs before choosing what to build.

Revenue amounts, downloads, ad counts/spend, subscription tiers, paywall analysis and keyword scores remain unavailable (`null` in the store catalog). No metrics are randomly generated. Grossing ranks come only from ordered grossing feed entries; store-search order is never a rank. Meta, Google and TikTok links open free research destinations and do not prove a matching campaign exists. No paid provider, trial, personal API key or subscription is configured.

The existing saved catalog and live Apple search remain under **Store Search**. Every store listing includes its source and retrieval timestamp. Prices are upfront download prices; screenshots are store promotional images, not verified ads or paywalls.

## Security changes

- Next.js 15.5.28 and React/React DOM 19.0.9, with patched transitive dependencies locked in `pnpm-lock.yaml`.
- Dependency lifecycle scripts disabled. The supported package manager is pinned to pnpm 11.25.0; both workspace settings and install commands enforce this policy.
- A normal password sign-in page with signed, 12-hour HttpOnly session cookies (Secure in production and SameSite=Lax). Sessions use JOSE with a key derived from the existing high-entropy password; changing the password revokes existing sessions. The search and grossing APIs and data pages also verify sessions independently of middleware. Missing or short passwords fail closed with HTTP 503.
- Live store requests have a 5-second deadline, a 1 MB response limit, fixed Apple endpoints, no redirects, and at most two concurrent requests per process. Store queries are limited to 120 characters.
- Search responses contain at most 48 results. Process-local guards allow 60 API searches and 20 outgoing store requests per minute. These guards are not a distributed rate limiter; strong password protection is the main access boundary. Public deployments would additionally need an edge/distributed rate limit.
- Unused server-side image optimization is disabled, and basic security response headers are set.
- CI runs dependency audit, lint, type checking, security tests, production build and HTTP smoke tests. Actions are pinned to commit hashes.

The dependency audit is a point-in-time check, not a guarantee against unknown vulnerabilities. Re-run it before deployment and when updating dependencies. PostCSS, source-map-js, postcss-selector-parser, brace-expansion and sharp have explicit patched overrides because upstream ranges may otherwise retain vulnerable versions. Remove an override only after re-auditing and testing its replacement.

## Run locally

Use Node.js 24 LTS and pnpm 11.25.0. The supported Node range also permits recent Node 22 and 25 for development.

```sh
pnpm install --frozen-lockfile --ignore-scripts
cp .env.example .env.local
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Put the generated value in `.env.local` as `OPENKITTY_PASSWORD`. Do not paste it into chat, commit it, or use a `NEXT_PUBLIC_` variable. Passwords must contain at least 24 non-padding characters and be no more than 256 characters.

```sh
pnpm dev
```

Open http://127.0.0.1:3000 and enter your generated password on the sign-in page. Development and production start commands bind only to the loopback interface by default.

## Deploy your fork on Vercel

1. Import **Aks22-64/openkitty** into your Vercel account and select the `main` branch.
2. Use the Next.js framework preset, repository root, and Node.js 24.
3. Add `OPENKITTY_PASSWORD` to the Production and Preview environment settings, using a newly generated strong password. Keep it server-only.
4. Deploy. `vercel.json` pins the install command to pnpm 11.25.0, freezes the lockfile, disables install scripts, and uses the standard Next.js build.
5. Open the HTTPS deployment URL and enter your password on the sign-in page.

A deployment without the password will deliberately show an unavailable response. Password changes require updating the environment variable and redeploying. Production must be served over HTTPS. The login form checks the request origin, caps request bodies at 4 KB, and limits attempts to 20 per minute per process. Sign out clears the browser cookie; a copied session token remains valid until its 12-hour expiry or a password rotation. The repository and its public app-store dataset remain public; this password controls use of the running app, not access to the open-source files.

## Verify changes

```sh
pnpm audit
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:smoke
```

The smoke test starts temporary loopback-only production servers with an ephemeral test password and shuts them down afterwards. It does not query Apple or require your real password. Tests cover the HTML sign-in and error flow, signed session expiry/tampering/rotation, cross-origin login/logout rejection, cookie clearing, missing/wrong credentials, a middleware-bypass header, search limits and throttling, disabled image optimization, and normal authenticated pages.

## Daily collection and free hosting

`.github/workflows/daily-grossing.yml` runs at **03:17 UTC / 08:47 IST** and can be dispatched manually. The scheduler may be delayed; the UI warns once the latest observation is over 36 hours old. GitHub can disable scheduled workflows after prolonged repository inactivity: the **Collection status** link exposes the run history and re-enable control.

The job uses standard GitHub-hosted runners in this public repository, requires no dependency installation, and refuses to run if the repo becomes private. It collects nine complete top-100 feeds, then refreshes lookup metadata for new apps and existing records older than seven days. Apple calls are paced and bounded. A partial, malformed or stale chart aborts before replacing saved history; unavailable lookup metadata stays missing or retains its clearly dated prior value.

Only the publication step receives the built-in `GITHUB_TOKEN`. It can update only `src/data/grossing-history.json`, checks the exact repository and main-branch parent, and uses a non-forced ref update so concurrent code changes cannot be overwritten. No credentials are committed. Manual collection: `npm run data:collect`.

The app reads the public history file from GitHub with an hourly server cache; data-only commits do not need a new deployment. `ignoreCommand` skips only such builds. A validated bundled snapshot is the visible fallback if the public file is unavailable or invalid. Code deployments still run the normal build. Both the repository and observations are public; app password protection does not make source data private. This design uses no paid API, database, Vercel cron or upgraded runner. Hosting remains subject to the account's free-plan limits.

The source is Apple's legacy public [Top Grossing feed](https://itunes.apple.com/us/rss/topgrossingapplications/limit=100/json) and [lookup API](https://itunes.apple.com/lookup?id=6448311069&country=us). Feed availability and coverage can change; there is no source SLA. Rank is a revenue-related signal, not a dollar-revenue or profitability estimate.

`node scripts/refresh-catalog.mjs` separately refreshes the older top-free/top-paid discovery catalog for Store Search. Top-paid means upfront download price; its order is not used as a grossing rank. The original fake-data generators were removed and remain removed. Catalog category counts describe the sample, not market share.

The original source, history and attribution are retained. Upstream describes the project as MIT licensed.
