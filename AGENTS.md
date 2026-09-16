# Repository notes

Marketing site + lead-capture API for dutaintegra.my. Node >= 22, ES modules,
**zero runtime dependencies** — keep it that way unless there is a strong reason.

## Layout

| Path | What it is |
|---|---|
| `Web/` | Static HTML pages. This is what production serves. |
| `server/` | The Node server: `handler.mjs` (routing + most endpoints), `portal.mjs` (client auth), `enquiries.mjs` (storage), `stats.mjs`, `digest.mjs`, `autonomous-ops.mjs` |
| `api/gateway.js` | Vercel serverless entrypoint. Just re-exports `handle` from `server/handler.mjs`. |
| `api/audit.js` | Separate self-contained audit tool, wired to its own rewrites |
| `vercel.json` | Deployment + the security headers production actually enforces |
| `web-new/` | React + Vite app, not currently deployed. Status unresolved — see below. |

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
