# OpenKitty — personal fork

A password-protected fork of [Ishak-ctrl-ui/openkitty](https://github.com/Ishak-ctrl-ui/openkitty), a Next.js app for exploring public App Store information.

**Data quality:** app listings and images come from store data, but many revenue, download, trend, ad and paywall figures are estimates, simulations or hardcoded examples. They are not verified market intelligence.

## Security changes

- Next.js 15.5.28 and React/React DOM 19.0.9, with patched transitive dependencies locked in `pnpm-lock.yaml`.
- Dependency lifecycle scripts disabled. The supported package manager is pinned to pnpm 11.25.0; both workspace settings and install commands enforce this policy.
- A normal password sign-in page with signed, 12-hour HttpOnly session cookies (Secure in production and SameSite=Lax). Sessions use JOSE with a key derived from the existing high-entropy password; changing the password revokes existing sessions. The search API and live app-detail page also verify sessions independently of middleware. Missing or short passwords fail closed with HTTP 503.
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

## Data refresh

The upstream scheduled ingestion is disabled in this fork. Its legacy script replaces the bundled 15,000-record dataset with a much smaller collection, so it should not be enabled casually. A manual run additionally requires the repository variable `ENABLE_DATA_SYNC=true`. Review the ingestion behavior before setting that variable.

The original source, history and attribution are retained. Upstream describes the project as MIT licensed.
