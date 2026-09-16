# Repository notes

Marketing site + lead-capture API for dutaintegra.my. Node >= 22, ES modules,
**zero runtime dependencies** — keep it that way unless there is a strong reason.

## Layout

| Path | What it is |
|---|---|
| `Web/` | Static HTML. `vercel.json` sets `outputDirectory: "Web"`, so this is what deploys. |
| `Web/assets/index-*.js` | A **built React bundle** (380 KB). `Web/index.html` is a Vite build artifact, not hand-written. |
| `server/` | The Node server: `handler.mjs` (routing + most endpoints), `portal.mjs` (client auth), `enquiries.mjs` (storage), `stats.mjs`, `digest.mjs`, `autonomous-ops.mjs` |
| `api/gateway.js` | Vercel serverless entrypoint. Just re-exports `handle` from `server/handler.mjs`. |
| `api/audit.js` | Separate self-contained audit tool, wired to its own rewrites |
| `vercel.json` | Deployment + the security headers production actually enforces |
| `web-new/` | React 19 + Vite + Tailwind 4 source, 6 routes. Not built by `vercel.json`. |

## There are two frontends and they collide

This is the single most confusing thing in the repo. Neither the READMEs nor
`HANDOFF.md` explain it.

`Web/` is a **mix**: `index.html` is a React build artifact (`<div id="root">`
plus a hashed `/assets/index-*.js`), while the other 23 pages are hand-written
HTML with inline scripts. So React and static HTML are shipped side by side in
the same directory.

`web-new/` is the React source for that bundle, with routes `/`, `/services`,
`/about`, `/pricing`, `/contact`, `/quiz` — all six of which **also exist as
static `.html` files** in `Web/`. Two implementations of the same six pages.

Production (`https://www.dutaintegra.my`):

| Path | Result |
|---|---|
| `/` | 200, serves the React bundle |
| `/services`, `/about`, `/pricing`, `/contact`, `/quiz`, `/cases`, `/calculator`, `/faq` | **404** |

The clean-URL routes 404 because `vercel.json` has no SPA fallback rewrite;
static pages are only reachable with an explicit `.html`. The React navbar
links to `/services`, `/about`, `/pricing`, `/quiz`, `/contact` — so the live
homepage's own navigation already 404s.

Some static pages link clean URLs (`/services`, `/work`, `/pricing`, `/about`,
`/contact`, `/audit`) that also 404; `79` references still use `services.html`.
`/work` has no page at all in either frontend.

**Nothing here is settled.** Do not assume `Web/` is canonical just because it
deploys — the deployed homepage is React. Decide which frontend is real, make
one win, and delete the other. `bf66f32` previously turned the build command
off to dodge pre-existing TypeScript errors in `web-new/`, which is worth
resolving rather than working around.

## Where the site actually breaks in production

Verified against `https://www.dutaintegra.my`, not inferred from config.

**Every clean URL 404s.** `vercel.json` has no SPA fallback rewrite, so only
`/` (and explicit `.html` paths) resolve:

| Path | Result |
|---|---|
| `/` | 200 — serves the React bundle |
| `/services.html`, `/about.html`, `/pricing.html`, `/cases.html`, `/calculator.html`, `/audit.html` | 200 — static HTML |
| `/services`, `/about`, `/pricing`, `/contact`, `/quiz`, `/cases`, `/calculator`, `/faq` | **404** |

The React navbar links to `/services`, `/about`, `/pricing`, `/quiz`,
`/contact`, so the live homepage's own menu 404s. Static pages also link clean
URLs (`/services`, `/work`, `/audit`, `/about`, `/pricing`, `/contact`); `/work`
has no page at all in either frontend. 79 references still use `services.html`.

**Fonts are declared but never loaded, in both frontends.**

- `Web/audit.html` is the only static page that requests Google Fonts
  (`fonts.googleapis.com` + `fonts.gstatic.com`). The CSP blocked both, so it
  rendered in fallback fonts. Fixed in `c82e2a4`.
- The React bundle declares `--font-sans: "Inter"` and
  `--font-heading: "Syne"` but ships **no `@font-face`, no Google Fonts import,
  and no `.woff` file** — so `/` renders in fallback fonts too, and no CSP
  change affects that. Fixing it means adding the font sources to `web-new/`.

## The thing that trips people up

**Two entrypoints run the same handler, but only one serves the site.**

- Locally, `server/index.mjs` serves both `Web/` and the API.
- In production, **`vercel.json` serves `Web/` directly** and never runs the
  static logic in `handler.mjs`. Only `/api/*`, `/admin/*` reach
  `api/gateway.js`.

Two consequences worth remembering:

1. Security headers for the static site live in `vercel.json`, **not** in
   `handler.mjs`. Editing one does not affect the other. They are intentionally
   kept in sync via `SECURITY_HEADERS` in `handler.mjs`; if you change a policy,
   change both.
2. `web-new/` builds nothing in production (`buildCommand: ""`,
   `outputDirectory: "Web"`). Decide which is canonical before investing there.

## Workflow

```bash
npm test            # 89 tests, node:test, no deps
npm start           # loads .env via --env-file-if-exists
```

`npm start`/`dev` pass `--env-file-if-exists=.env`, so a missing `.env` is fine.
There is no `dotenv` and shouldn't be.

## Conventions

**Rate limiting.** `rateLimit(key, now, limit, windowMs)` is module-level state
keyed by string. Credential endpoints get their own budget via
`loginRateLimit()` — do not let a login route fall back to the marketing budget.
Because the counters are process-global, **tests must pass an explicit
`x-forwarded-for` per case** or they consume each other's budget; use the
`nextIp()` helper.

**Tokens.** `ADMIN_TOKEN` and `DIGEST_TOKEN` both **fail closed**: unset means
the route is refused, never open. Compare secrets with `constantTimeEqual()`,
never `===`.

**CSP.** The policy is deliberately origin-by-origin and derived from what the
pages actually load. Before adding an origin, check whether the page uses it as
a `<script src>` or a `<link rel="stylesheet">` — `cdn.jsdelivr.net` is a style
and font origin only, and granting it `script-src` would be needless risk.
`server/handler.test.mjs` asserts the policy against the real pages and against
`vercel.json`; a policy that blocks the site's own assets fails the suite.

**Headers over plain HTTP.** `SECURITY_HEADERS` omits HSTS on purpose. Sending
it from a local HTTP server pins browsers to HTTPS on localhost.

## Environment variables

`.env.example` documents every variable the code reads. There is a test-adjacent
check worth repeating after adding one: extract `process.env.*` references from
`server/` and `api/`, and diff against the names in `.env.example`. They should
match exactly — no undocumented variables, no phantom ones.

## Unverified claims

`ENTERPRISE_AUDIT_REPORT.md` was written against `77f65a0` and has been partly
corrected since, but its per-endpoint tables and OWASP ASVS percentages still
reflect an older structure (they reference `/api/enrol` and `/api/contact`,
which no longer exist). Treat the body as historical and the remediation section
at the top as current.
