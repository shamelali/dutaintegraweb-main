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

**Production is 26 commits behind, and pushing does not fix it.** Verified
against the live site on 2026-10-29: `https://dutaintegra.my/` serves
`assets/index-B54e6WfU.js`, the bundle this repo had at `9b0d08e` (2026-10-26
00:20). `main` ships `index-CBW-nu39.js`. Two pushes landed on `main` that day
and `/api/health` kept answering the old three-key body, so nothing deployed
them.

Three consequences worth internalising before trusting any statement in this
file about production behaviour:

1. `da96b03` "Revert Phase 4 deployment — restore pre-Phase 4 production state"
   replaced that bundle in the repo, but the revert never reached the live
   site — production is still serving the Phase 4 build the revert deleted.
2. Everything after `9b0d08e` is unreleased: the client portal, admin auth, the
   CMS, the leads pipeline, the datastore health probe, testimonial capture and
   durable sessions.
3. The route table above describes what *this tree would* serve, not what the
   deployed bundle does. A 200 from a live path is not evidence the deployed
   code produced it — `/admin/pipeline` answers 200 there by serving the app
   shell.

The deployment mechanism is unverified: Cloudflare terminates TLS at the edge
and hides the origin's `server` header, no `x-vercel-*` header survives, and
neither `vercel` nor `wrangler` was logged in at the time of writing. Confirm
which project owns the domain and why its builds stopped on 2026-10-26 before
assuming a merge to `main` ships anything. Note also that
`www.dutaintegra.my` 301-redirects to the apex, so the `www` host used
throughout this file is not the canonical origin.

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

**Production is the Cloudflare fork, not the Vercel path.** Established on
2026-10-29 by probing the live site: `/api/auth/me` and `/api/auth/logout` —
routes that exist only in `server/handler-cloudflare.mjs` — answer 401 and 200,
while `/api/portal/me` and `/api/portal/logout` return 404. Static assets carry
`server: cloudflare` with `etag`/`cf-cache-status` and no `x-vercel-*`. The
wiring is `functions/api/[[path]].js` and `functions/admin/[[path]].js`, both of
which import `handler-cloudflare.mjs` and copy Pages env into `process.env`
before calling it, over the `public/` directory with `_headers` and `_redirects`.

Consequences:

1. **`handler.mjs` is the local and Vercel entrypoint, and it is not what users
   hit.** Everything below about `vercel.json` describes a deployment that is
   not live. The two forks have also diverged in substance, not just plumbing:
   `portal.mjs` hand-rolls cookie sessions against `portal_sessions`, while
   `portal-cloudflare.mjs` uses Supabase Auth and puts an access token in the
   `di_session` cookie. A fix to one does not fix the other.
2. **The schema guard watches the wrong entrypoint.** `server/schema.test.mjs`
   computes "live sources" by walking imports from `handler.mjs`, so it cannot
   see the deployed path. Re-running that walk from
   `handler-cloudflare.mjs` instead finds five tables the deployed code names
   with no migration declaring them, confirmed absent from the live database on
   2026-10-29 by an anon-key REST probe (`404`, where `workspace_proposals`
   answers `200`): `ops_tasks`, `ops_audit_log` and `profiles`
   (`server/ops-tasks-cloudflare.mjs`), `proposals` and `projects`
   (`server/portal-cloudflare.mjs`). See the next section for why none of them
   is ever reached.
3. **The two frontends are separate builds.** `Web/` is what `npm run
   build:web` writes and what Vercel would serve; Pages serves `public/`.
   Production's bundle hash matches neither.

## The Cloudflare fork's Phase 3/4 layer does not run

`server/supabase-client.mjs` exports `supabaseAdmin`, a hand-rolled builder with
**zero runtime dependencies**. It is *not* supabase-js and it is *not* chainable:
`from(table)` returns an object whose `select`, `insert`, `update`, `eq`, `order`
and `limit` each fire a request immediately and return a promise of the parsed
body. Real supabase-js returns a query builder and resolves to `{ data, error }`.

`ops-tasks-cloudflare.mjs` and the proposals/projects half of
`portal-cloudflare.mjs` are written against supabase-js. So
`from("ops_tasks").select("...").order("created_at")` is `promise.order` — a
`TypeError`, seen in the test log as
`supabaseAdmin.from(...).select(...).order is not a function`. Every one of those
handlers fails on its first statement, which is why the missing tables were never
noticed: the query never reaches PostgREST. `const { data, error } = await ...`
would also silently misread the shim's return even if chaining worked.

Consequences to keep in mind:

- `/api/portal/proposals` and `/api/portal/proposals/:id` are called by
  `web-new/src/pages/portal-proposals.tsx`, whose `Proposal` type
  (`summary`, `scope`, `amount_myr`) is the `workspace_proposals` shape. The
  Vercel fork already serves that table; the fork serves a `proposals` table that
  exists nowhere, in a shape the UI could not render. Fixing this means porting
  the handlers to the shim's REST style (as `cfSbFetch` in
  `handler-cloudflare.mjs` does) *and* onto `workspace_proposals` — not creating
  a `proposals` table.
- `clients.id = auth.users.id` by construction in this fork
  (`portal-cloudflare.mjs:175` seeds the row from the signup response), so
  `workspace_proposals.client_id` is a valid FK for it. The two forks still
  disagree about what a client is.
- The `/api/ops/tasks*`, `/api/ops/task-stats` and `/api/ops/audit-log` routes
  reached the data layer with **no auth check at all**; they answered `500` to an
  unauthenticated `GET`, which is what made the hole look harmless. Gated behind
  `requireAdminSession` on 2026-10-29, covered by
  `server/handler-cloudflare.test.mjs` — the first test over the deployed
  entrypoint. Anyone who ships `ops_tasks` without that gate would be opening an
  unauthenticated read/write API over an audit log.
- Nothing in the suite exercises the fork's router, and no test covers
  `ops-tasks-cloudflare.mjs`. Treat changes there as unverified.

- Locally, `server/index.mjs` serves both `Web/` and the API.
- On Vercel, **`vercel.json` serves `Web/` directly** and never runs the
  static logic in `handler.mjs`. Only `/api/*`, `/admin/*` reach
  `api/gateway.js`.

Two consequences worth remembering:

1. Security headers for the static site live in `vercel.json`, **not** in
   `handler.mjs`. Editing one does not affect the other. They are intentionally
   kept in sync via `SECURITY_HEADERS` in `handler.mjs`; if you change a policy,
   change both. The live equivalent for Pages is `public/_headers`.
2. Vercel runs `buildCommand: "npm run build:web"` before uploading, so the
   committed `Web/index.html` + `Web/assets/index-*` are **build outputs**. They
   are committed anyway so the repo works without a build step; regenerate them
   with `npm run build:web` rather than editing them.

## Workflow

```bash
npm test            # 189 tests, node:test, no deps; runs in a throwaway DATA_DIR
npm run test:web    # 15 tests, Vitest + Testing Library (needs web-new/node_modules)
npm start           # loads .env via --env-file-if-exists
npm run build:web   # build web-new/ into Web/ (the deploy artifact)
npm run lint:web    # oxlint over web-new/ (needs web-new/node_modules)
npm run verify      # tests + build + web tests + lint — run this before pushing
```

`npm start`/`dev` pass `--env-file-if-exists=.env`, so a missing `.env` is fine.
There is no `dotenv` and shouldn't be.

`npm run verify` is the whole gate in one command: it runs `build:web` before
`test:web` and `lint:web` because both need `web-new/node_modules`, which the
build installs.

Frontend tests live next to what they cover (`src/**/*.test.tsx`) and run under
Vitest with `environment: "jsdom"` — configured in `web-new/vite.config.ts`, so
one config serves the build and the tests. `tsconfig.app.json` excludes them and
`tsconfig.vitest.json` type-checks them with Node types; the browser build never
sees Node's globals.

**Scroll reveal is armed by an inline script, not by CSS.** `Web/index.html` and
`public/index.html` add `js-reveal` to `<html>` before the stylesheet paints,
and `web-new/src/index.css` hides `.reveal` only under that class. A client that
does not run the bundle — a crawler, a print, a failed script load — sees every
section, instead of 35 blocks of `opacity: 0`. Re-adding a bare
`.reveal { opacity: 0 }` fails `src/hooks/use-scroll-reveal.test.tsx`.

## CI

`.github/workflows/ci.yml` has four jobs:

| Job | What it does |
|---|---|
| `test` | `npm test` — `node --test` over `server/**/*.test.mjs`. Needs no install (root has zero deps). |
| `frontend` | `npm ci`, Vitest unit tests, `oxlint`, and `tsc -b && vite build` in `web-new/`; uploads `dist/`. |
| `secret-scan` | `scripts/scan-secrets.mjs` over the working tree and full git history. |
| `artifact-drift` | Runs `npm run build:web`, then fails if `Web/` no longer matches source. |

The `frontend` job exists because its absence is what let 70 TypeScript errors
accumulate in `web-new` unnoticed — CI previously only tested `server/`, so the
frontend could rot while CI stayed green. `artifact-drift` guards the other half
of the same failure: a committed `Web/` bundle that had drifted from `web-new/`
source. If it fails, run `npm run build:web` and commit the result.

`secret-scan` uses patterns plus a liveness check. A pattern hit is only a
warning; the job fails only when a credential is confirmed live against the API
of the provider that issued it. That keeps a red X meaningful — a revoked token
or a docs example never breaks the build, and `--strict` is available if you
want pattern hits to fail too. Findings are always redacted, because printing a
secret to warn about the secret would leak it again into the CI log.

History is scanned as well as the working tree, because a secret that was
committed and later deleted is still recoverable from any clone. That needs
`fetch-depth: 0`, which the job sets.

Dependabot (`.github/dependabot.yml`) watches `web-new/` npm packages weekly and
the workflow actions monthly. Minor and patch bumps are grouped into one PR;
majors arrive separately so they get read properly.

**GitHub Actions cannot run jobs for this account.** Every CI job — 20+ runs
across all of `shamelali`'s repos — ends `failed` with `runner_name: ""`, zero
steps and an empty log archive: GitHub never allocated a runner, so the workflow
never started. `actions/permissions` reports `enabled: true, allowed_actions:
all`, `ci.yml` parses and its four jobs are all `runs-on: ubuntu-latest`, so
this is *not* a repo or workflow defect. The only runs that succeed are
GitHub-managed ones (`path: dynamic/dependabot/...`), which do not use the
hosted-runner queue and so are not evidence that runners work. Resolve it at
`github.com/account` (Actions usage / billing hold / verification notice) before
reading a red X as broken code — until then CI tells you nothing, and `npm run
verify` locally is the only real gate.

## Automations

`automations/` holds OpenHands automations, run on cron. See
`automations/README.md`. These are deliberately LLM-free scripts — a scheduled
health probe is deterministic, so an agent-driven run would burn tokens for no
benefit.

Deployed:

| Automation | ID | Schedule |
|---|---|---|
| DI uptime + deploy-integrity watch | `1aebf583-b3f9-44d3-af7f-227398cedf4a` | `*/15 * * * *` UTC |

Deploying a change means rebuilding the tarball and re-uploading, which creates
a *new* automation — the tarball is snapshotted at upload time, so editing
`automations/uptime-watch/main.py` in the repo changes nothing until redeployed.
Uploads are capped at 1 MB.

Alerting needs a secret named `ALERT_WEBHOOK_URL` (a Slack incoming webhook
works). It is fetched at runtime, so adding it later requires no redeploy. Until
it exists the watch still runs and records history; it just reports silently.

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

**Storage backend resolution lives in `server/store.mjs`, and nowhere else.**
Every store (clients, enquiries, tickets, sessions, digest, cms, portal,
handler) asks the resolver which backend owns the request. Do not re-add a
local `supabaseConfigured()`. The rules:

| `SUPABASE_URL` | `SUPABASE_SERVICE_ROLE_KEY` | Result |
|---|---|---|
| set | set | Supabase |
| either set, other unset | — | `StorageConfigError`, **in every environment including dev** |
| both unset, `NODE_ENV=production` | — | `StorageConfigError` |
| both unset, elsewhere | — | JSONL in `data/`, warned once per process |

Use `usingSupabase()` when a call site must fail loudly (it throws), and
`supabaseReady()` in route guards that should answer 503 instead of 500.
Supabase write failures propagate — no write may quietly land in a file.

**Portal sessions live in `server/sessions.mjs`, never in process memory.** The
table is `portal_sessions`, keyed on `token_hash` (SHA-256 of the cookie value —
the live token is never stored, so a datastore leak hands out no sessions). A
`Map` in `portal.mjs` cannot work here: Vercel runs the handler in short-lived
processes, so every cold start would sign every client out, and clearing a cookie
is not revocation. Expired rows are pruned on login rather than by a cron,
because this deployment has no cron.

`/api/health` proves the datastore rather than describing the config: with
Supabase selected it writes, reads back and deletes a sentinel row in
`health_probe`, caches that for 60s, and answers **503** when the round-trip
fails, when the pair is half-configured, or when the JSONL fallback is active on
a serverless platform. `?fresh=1` bypasses the cache. It never echoes provider
error bodies, because those name tables and columns. The uptime automation reads
`datastore.backend` and pages persistence separately from outages — see
`automations/README.md`.

The schema is versioned under `supabase/migrations/`; `server/schema.test.mjs`
fails if code references a table or column no migration declares, if a table
ships without RLS, or if a `create policy` omits a `to <role>` clause (which
grants access to role `public`, and `anon` inherits it). Read
`supabase/README.md` before adding a column.

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely. It must stay
server-side — never Vite-prefixed (`VITE_*`), never in a client bundle, never in
a response body or log line.

**Store paths live in `server/paths.mjs` (`dataFile()`), and `npm test` never
touches `data/`.** Every JSONL path resolves through `DATA_DIR`, and
`scripts/test-server.mjs` — which is what `npm test` now runs — starts the suite
with `DATA_DIR` pointed at a temporary directory. This matters because each store
module used to build `join(PROJECT_ROOT, "data", ...)` itself, so every test run
appended synthetic rows into the developer's real local files (1,288 fake
`Test Client` accounts at the time it was found). If you add a store, use
`dataFile("name.jsonl")`; `server/paths.test.mjs` fails the build if a module
rebuilds the path by hand instead.

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
