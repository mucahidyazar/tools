# tools.mucahid.dev

Small, fast, free everyday tools: finance calculators, converters, generators and
reflection tools. Everything runs in the browser; the only server feature is an
anonymous "tool opened" counter.

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
| `npm run data:update` | Download fresh CPI, FX, gold, NASDAQ and rate series (see `src/data/SOURCES.md`) |
| `npm run data:build` | Regenerate `src/lib/generated/series.ts` from the CSVs without downloading |

## Configuration

Copy `.env.example` to `.env` and adjust:

- `NEXT_PUBLIC_SITE_URL` — public origin used for canonical URLs, sitemap, robots and Open Graph.
- `TOOLS_DATA_DIR` — directory for `tool-usage.sqlite`. Defaults to `./.data`.

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

## Security notes

- Tool inputs never leave the browser. The usage API accepts only same-origin
  JSON with a tool slug and a random visit id, rate-limits by a signed
  HttpOnly cookie, and stores no IP addresses.
- Security headers are set in `next.config.ts`. A nonce-based CSP is not yet
  configured; add it via middleware before enabling third-party scripts.
- `npm audit` currently reports a PostCSS advisory that is only fixed by
  Next.js 16. It affects processing of untrusted CSS at build time, which this
  project does not do; plan the Next 16 upgrade as a separate task.
