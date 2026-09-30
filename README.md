# tools.mucahid.dev

Small, fast, free everyday tools: finance calculators, converters, generators and
reflection tools. Calculations run in the browser: tool inputs, generated passwords
and converted text are not sent to the server. The server maintains aggregate
tool-open counts. Optional Google integrations are separate and consent-controlled.

## Getting started

Use Node.js 24 and npm with the committed `package-lock.json`:

```sh
npm ci
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`. Never commit local environment files or usage databases.

## Stack

- Next.js 15 (App Router, standalone output), React 19, Tailwind CSS 4
- Radix UI primitives, lucide-react icons
- `node:sqlite` for the usage counter (Node ≥ 22.13, no native build step)
- Tests with the built-in Node test runner (`node --test`)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (`.next-dev` build dir, port 3000) |
| `npm run build` / `npm start` | Production build and server |
| `npm run check` | Lint, type-check and unit tests |
| `npm run test:e2e -- --grep-invert @visual` | Playwright checks against `E2E_BASE_URL` (default `http://127.0.0.1:3457`); start the server first |
| `npm run data:update` | Download fresh CPI, FX, gold, NASDAQ and rate series (see `src/data/SOURCES.md`) |
| `npm run data:build` | Regenerate `src/lib/generated/series.ts` from the CSVs without downloading |

## Configuration

Copy `.env.example` to `.env` and adjust:

- `NEXT_PUBLIC_SITE_URL` — public origin used for canonical URLs, sitemap, robots and Open Graph.
- `TOOLS_DATA_DIR` — directory for `tool-usage.sqlite`. Defaults to `./.data`.
- `NEXT_PUBLIC_GTM_ID` — optional GTM Web container; takes priority over direct GA.
- `NEXT_PUBLIC_GA_ID` — optional direct GA4 fallback when GTM is unset.
- `NEXT_PUBLIC_ADSENSE_CLIENT` / `NEXT_PUBLIC_ADSENSE_SLOT` — public publisher and display-ad unit IDs.
- `NEXT_PUBLIC_ADSENSE_ENABLED` — defaults to `false`; keep disabled until account/site approvals and consent setup are complete.

All `NEXT_PUBLIC_*` values are public and embedded at **build time**. In Coolify,
make them available at build time and runtime, and rebuild after changes. Never
place account credentials or API secrets in them. `TOOLS_DATA_DIR` is runtime-only.

## Deployment

The usage counter needs a **persistent, writable disk**; serverless platforms with
ephemeral filesystems (Vercel, Netlify functions) will silently reset counts on
every deploy or cold start. Use a container or VM with a mounted volume:

```bash
docker build -t tools .
docker run -p 3000:3000 -v tools-data:/data tools
```

Fly.io (volumes), Railway/Render (persistent disks), Coolify, or any VPS work the
same way: mount the volume at `/data` (or set `TOOLS_DATA_DIR`). If the disk is
unavailable the API answers 503 and the home page shows a dash instead of counts;
the tools themselves keep working.

Language is a client-side toggle persisted in `localStorage`; the server always
renders Turkish and the choice is applied before first paint by a small inline
script, so URLs are shared across both languages.

## Data

Economic series are bundled at build time from FRED and the World Bank and
compiled into a compact monthly format (`src/lib/generated/series.ts`). Refresh
them with `npm run data:update`, review the diff and commit. Payroll parameters
live in `src/lib/salary.ts` (Türkiye) and `src/lib/salary-countries.ts`
(US, UK, Germany); update them when the yearly figures are published.

Calculators are informational, not professional financial or medical advice.

### Coolify with an existing Cloudflare Tunnel

Use the root Dockerfile, build context `/`, exposed port `3000`, public origin
`https://tools.mucahid.dev`, and a named volume mounted at `/data`. The image runs
as the non-root `node` user and creates its data directory with the correct ownership.

For a tunnel connector on the same server, map a free loopback port (for example
`127.0.0.1:10104:3000`) and route `tools.mucahid.dev` to
`http://127.0.0.1:10104`. The public-hostname setup creates tunnel DNS; avoid
conflicting A records and preserve the existing tunnel's other routes.

If the connector runs on another LAN machine, bind the published port to the
Coolify server's LAN IP rather than loopback, and use that LAN IP in the tunnel
service URL. Do not open this origin port to the public Internet.

After deploying, verify HTTPS, calculators, `/api/tool-usage`, robots, sitemap and
usage-counter persistence across a redeploy. Install Chromium with
`npx playwright install chromium`; build and run `npm start -- -p 3457` before
local Playwright checks. Visual snapshots are platform-specific.

## Analytics and advertising

The re-openable Privacy settings panel defaults to denying both optional purposes.
Google scripts are not downloaded before the corresponding choice. If browser
storage is blocked, the choice applies only to the current document.

In GTM, use native tags, a `site_page_view` custom-event trigger and v2 data-layer
variables for `page_path`, `page_location` and `page_referrer`. Configure the Google
tag with `send_page_view=false`, firing once per page before the GA4 `page_view`
event. Disable GA4 Enhanced Measurement. Do not add history, form or search triggers:
the app emits one view per pathname change, strips query strings/fragments and
clears the referrer. GTM takes priority over direct GA to prevent duplicate integrations.
Google may use cookies/device identifiers after consent; path sanitization does
not make its processing anonymous.

Ad slots are labelled and separate from calculator controls. They render only when
the feature flag, publisher ID, slot ID and advertising consent are present.
`/ads.txt` publishes the configured publisher record, or returns 404 without one.
Before enabling ads, finish AdSense account/site approval, configure the required
Google-certified CMP and verify domain-level ads.txt requirements. This site's
preference panel is **not** a certified AdSense CMP. Never click your own ads to test.

## Security notes

- Tool inputs never leave the browser. The usage API accepts only same-origin
  JSON with a tool slug and a random visit id, rate-limits by a signed
  HttpOnly cookie, and stores no IP addresses.
- Security headers are set in `next.config.ts`; a nonce-based Content Security
  Policy is not currently implemented. Review dependency audit findings and
  third-party tag changes independently of build/test results.

## Contributing

Focused bug reports, documentation fixes and pull requests are welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md) and [GitHub Issues](https://github.com/mucahidyazar/tools/issues).
Do not publish credentials, personal calculator inputs or private logs.

## License

The source is public, but the owner has not yet selected a reuse license. Until a
LICENSE file is added, public visibility does not grant an open-source license.
