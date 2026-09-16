# Repository notes

Marketing site + lead-capture API for dutaintegra.my. Node >= 22, ES modules,
**zero runtime dependencies** — keep it that way unless there is a strong reason.

## Layout

| Path | What it is |
|---|---|
| `Web/` | Static HTML. `vercel.json` sets `outputDirectory: "Web"`, so this is what deploys. |
| `Web/assets/index-*.js` | The **built React bundle**, produced by `web-new/`. `Web/index.html` is a Vite build artifact, not hand-written. **Do not edit by hand — regenerate with `npm run build:web`.** |
| `server/` | The Node server: `handler.mjs` (routing + most endpoints), `portal.mjs` (client auth), `enquiries.mjs` (storage), `stats.mjs`, `digest.mjs`, `autonomous-ops.mjs` |
| `api/gateway.js` | Vercel serverless entrypoint. Just re-exports `handle` from `server/handler.mjs`. |
| `api/audit.js` | Separate self-contained audit tool, wired to its own rewrites |
| `vercel.json` | Deployment + the security headers production actually enforces |
| `web-new/` | React 19 + Vite + Tailwind 4 source, 7 routes. This **is** the canonical frontend; `npm run build:web` builds it into `Web/`. |
| `scripts/sync-web.mjs` | Copies `web-new/dist` into `Web/`, replacing only `index.html`, `assets/index-*.{js,css}`, and root public files. Leaves the standalone static pages alone. |

## Frontend: `web-new/` is canonical

**Resolved: React (`web-new/`) wins.** The other `Web/*.html` pages are
standalone static pages (tools, legal, landing pages) that are still served
directly and are *not* part of the React app. `Web/index.html` and
`Web/assets/index-*` are generated — never edit them directly.

`npm run build:web` runs `npm --prefix web-new ci && npm --prefix web-new run
build && node scripts/sync-web.mjs`, and `vercel.json` sets
`buildCommand: "npm run build:web"`. So Vercel now builds React from source on
every deploy instead of shipping whatever bundle happened to be committed.

React routes: `/`, `/services`, `/about`, `/pricing`, `/contact`, `/quiz`.

Production (`https://www.dutaintegra.my`):

| Path | Result |
|---|---|
| `/`, `/services`, `/about`, `/pricing`, `/contact`, `/quiz` | 200, serve the React app |
| `/audit.html`, `/cases.html`, other `.html` pages | 200, standalone static pages |

### The SPA fallback rewrite

Clean URLs previously 404'd because there was no SPA fallback. The last entry
in `vercel.json` `rewrites` is:

```json
{ "source": "/((?!api/|admin/|assets/|.*\\.).*)", "destination": "/index.html" }
```

Order matters — Vercel applies rewrites top to bottom, so `/api/*` and
`/admin/*` rules must stay *above* this one. The negative lookahead excludes
`api/`, `admin/`, `assets/`, and anything containing a dot, which is what keeps
every existing static page and asset resolving to itself. If you add a static
page under a path with no extension, add it to the lookahead or it will be
swallowed by the fallback.

### Fonts

`web-new/src/index.css` declares `--font-heading: "Syne"` and
`--font-sans: "Inter"`, and `web-new/index.html` loads both from Google Fonts.
The production CSP already allows `fonts.googleapis.com` (`style-src`) and
`fonts.gstatic.com` (`font-src`), so no CSP change is needed. `Web/audit.html`
loads Google Fonts separately and is the only static page that does.

## Where the site actually breaks in production

Verified against `https://www.dutaintegra.my`, not inferred from config.

**Clean URLs 404'd.** Fixed by the SPA fallback rewrite described above. Note
the legacy pages still link the `.html` variants (`79` references to
`services.html` and similar); those keep working but a visitor who lands on a
static page navigates the static site, not React.

| Path | Result |
|---|---|
| `/`, `/services`, `/about`, `/pricing`, `/contact`, `/quiz` | 200 — serve the React app (via the SPA fallback) |
| `/services.html`, `/about.html`, `/pricing.html`, `/cases.html`, `/calculator.html`, `/audit.html` | 200 — static HTML |

Both sets now resolve. The `.html` variants are the *legacy* static
implementations of pages that React also serves; React is canonical, and the
static ones remain for deep links and standalone tools.

**Fonts.** Both frontends now load the fonts they declare.

- `Web/audit.html` is the only static page that requests Google Fonts
  (`fonts.googleapis.com` + `fonts.gstatic.com`). The CSP used to block both, so
  it rendered in fallback fonts. Fixed in `c82e2a4`.
- The React app declares `--font-sans: "Inter"` and `--font-heading: "Syne"` and
  **now loads both** via `<link>` tags in `web-new/index.html`. Previously it
  shipped no `@font-face`, no import, and no `.woff`, so it rendered in fallback
  fonts. The existing CSP already allowed both origins, so no policy change was
  needed.

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
2. Vercel runs `buildCommand: "npm run build:web"` before uploading, so the
   committed `Web/index.html` + `Web/assets/index-*` are **build outputs**. They
   are committed anyway so the repo works without a build step; regenerate them
   with `npm run build:web` rather than editing them.

## Workflow

```bash
npm test            # 89 tests, node:test, no deps
npm start           # loads .env via --env-file-if-exists
npm run build:web   # build web-new/ into Web/ (the deploy artifact)
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
