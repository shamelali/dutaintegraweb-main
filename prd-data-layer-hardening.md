# PRD: Duta Integra Data Layer Hardening

## 1. Introduction

Duta Integra persists customer data — contact-form leads, portal client accounts,
support tickets, quiz audits, and monthly digests — through a **dual-backend**
design. Every store checks whether `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are both set and picks Supabase if so, otherwise it appends to a JSONL file under
`data/`.

That fallback is the problem. It is silent, it is unreachable-by-default in
production, and it is currently the *only* thing the platform health check does
not look at. The site can report itself healthy while lead capture writes to a
filesystem that Vercel discards on the next deploy.

This document specifies the work to make the data layer honest: fail loudly when
misconfigured, version the schema, and make health checks actually verify that
data can be written and read back.

**This is a PRD. Nothing here is implemented yet.**

## 2. Goals

- Make a configured-but-unreachable Supabase fail loudly rather than silently
  falling back to a local file.
- Make an *unconfigured* Supabase fail loudly in production, while preserving the
  convenient local-file workflow for development and tests.
- Bring the Supabase schema under version control. Today no `.sql`, schema, or
  migration file exists anywhere in the repository.
- Extend `/api/health` to verify the data layer end to end, not just the mail
  provider.
- Surface a persistence failure to the monitoring already in place (the
  `DI uptime + deploy-integrity watch` automation).
- Do not break the 89 existing server tests.

## 3. Evidence

Recorded so the requirements are grounded in observed behaviour, not theory.

| Observation | How confirmed |
| --- | --- |
| Five stores share the same silent fallback | `supabaseConfigured()` duplicated in `clients.mjs`, `enquiries.mjs`, `tickets.mjs`, `digest.mjs`, and inline in `handler.mjs:521` |
| Production likely runs on the fallback path | `GET /api/ops/feed` returns `{"stats":{"total":0}}` while the repository's `data/ops-events.jsonl` holds 8.9 KB of events |
| `/api/health` never touches the data layer | `handler.mjs:898` returns only `{ ok, inboxConfigured }` |
| The schema is unversioned | No `.sql` or migration files in the repo; tables (`leads`, `clients`, `tickets`, `monthly_digests`, `quiz_audits`) exist only as string constants in code |
| A `service_role` key is in play | Used in five modules; bypasses RLS entirely. `.env.example:41` already warns about this |
| The fallback writes real PII to disk | `data/clients.jsonl` (200 KB), `data/quiz-audits.jsonl` (74 KB), `data/tickets.jsonl` (20 KB) |

Two important nuances:

- **A `service_role` key accidentally exposed to a browser would grant full
  database control.** The code is server-side only today, and none of these
  variables are Vite-prefixed (`VITE_*`), so they do not reach the client bundle.
  The risk is real but currently contained; the goal is to keep it that way.
- **Reads differ from writes.** Supabase reads *throw* on a non-OK response
  (`enquiries.mjs:150`) and `jsonlList` swallows a missing file as `[]`. So a
  configured-but-broken Supabase fails the read rather than silently falling back.
  The silent path is specifically: *unset* variables, and *writes*.

## 4. User Stories

### US-001: Distinguish "no database configured" from "database unreachable"

**Description:** As an operator, I want a misconfigured production deploy to fail
loudly, so that I find out before leads are lost.

**Acceptance Criteria:**

- [ ] A single shared resolver replaces the five copies of `supabaseConfigured()`, returning one of: `supabase`, `jsonl`, or an error.
- [ ] When `SUPABASE_URL` is set but `SUPABASE_SERVICE_ROLE_KEY` is missing (or vice versa), the resolver raises a configuration error rather than silently choosing JSONL.
- [ ] When Supabase is configured and a write fails, the error propagates to the caller and the request returns a 5xx — it does **not** fall back to a file.
- [ ] When Supabase is unconfigured and `NODE_ENV=production`, the resolver raises a configuration error instead of using JSONL.
- [ ] When Supabase is unconfigured and `NODE_ENV` is not `production`, JSONL is used and a single startup warning is logged, once per process rather than per request.
- [ ] Existing tests that rely on the JSONL path continue to pass without setting `SUPABASE_*` variables.

### US-002: Make the health endpoint prove the data layer works

**Description:** As an operator, I want `/api/health` to tell me whether the
platform can actually store data, so that "healthy" means something.

**Acceptance Criteria:**

- [ ] `/api/health` reports the active backend (`supabase` or `jsonl`) in its response.
- [ ] `/api/health` reports a distinct status per dependency: `inbox` and `datastore`, each `ok` or `error`.
- [ ] When the datastore is reachable, the response includes a round-trip `write`/`read`/`delete` probe of a sentinel record.
- [ ] The probe writes to a dedicated sentinel table or key that is excluded from `listEnquiries`, client listings, and digest aggregation.
- [ ] The probe result is cached for a short interval (default 60s) so that probing does not run on every health request.
- [ ] A failing datastore makes `/api/health` return HTTP 503 with `ok: false`.
- [ ] The response **never** includes credentials, connection strings, or Supabase error bodies that could leak schema details.

### US-003: Version the database schema

**Description:** As a developer, I want the schema in the repository, so that a
fresh environment can be built from source instead of from guesswork.

**Acceptance Criteria:**

- [ ] A `supabase/migrations/` directory contains versioned SQL for the five tables the code reads and writes: `leads`, `clients`, `tickets`, `monthly_digests`, `quiz_audits`.
- [ ] Each table's columns match the fields the code actually sends, verified by reading each `supabase*` function — not transcribed from memory.
- [ ] Column types match the values written (for example `created_at` written as an ISO string for `timestamptz`).
- [ ] RLS is **enabled** on every table, with policies that deny all access to `anon` and `authenticated`. The server uses `service_role`, which bypasses RLS, so nothing legitimate needs a permissive policy; enabling RLS means a leaked `anon` key reaches nothing.
- [ ] A `README` in `supabase/` documents how to apply migrations and how to verify the schema matches the code.
- [ ] A test asserts that every table name and column referenced in `server/**` appears in the migration SQL, so schema and code cannot drift silently.

### US-004: Alert when production is running on the fallback

**Description:** As an operator, I want to be told when production is not using
durable storage, so that I do not discover it from a lost lead.

**Acceptance Criteria:**

- [ ] The `DI uptime + deploy-integrity watch` automation fails when `/api/health` reports `datastore` as `jsonl` in production.
- [ ] The alert message names the backend actually in use and states that writes are not durable.
- [ ] Signal is distinct from a plain outage so the two are not confused in Slack.
- [ ] Detection works on a response that is otherwise HTTP 200, because the fallback is not itself an error condition.

### US-005: Remove PII from the working tree

**Description:** As the data controller, I want customer PII out of the checkout,
so that a clone does not come bundled with personal data.

**Acceptance Criteria:**

- [ ] The record of what `data/*.jsonl` contains is documented (counts and kinds, not raw contents).
- [ ] Confirm `data/` was never committed. **Verified during drafting:** `git log --all -- data/` returns nothing, and `.gitignore:/data/` covers it. Re-confirm after any history rewrite; do not assume.
- [ ] A `data/README.md` explains that the directory is local-development scratch space and must never be treated as production storage.
- [ ] Existing local files remain where they are. Deleting them is out of scope.

## 5. Functional Requirements

- **FR-1:** Provide one module (for example `server/store.mjs`) exporting the backend resolver, replacing the five duplicated `supabaseConfigured()` implementations.
- **FR-2:** The resolver must treat a partially configured pair (`SUPABASE_URL` without key, or key without URL) as a hard error in every environment, including development.
- **FR-3:** In production, an unconfigured backend must raise a configuration error at first use.
- **FR-4:** Supabase write failures must propagate; no write may silently redirect to a file.
- **FR-5:** `/api/health` must return a JSON body containing `ok`, `inboxConfigured`, `datastore.backend`, `datastore.ok`, and `datastore.checkedAt`.
- **FR-6:** Health must return 503 when the datastore is not usable in production.
- **FR-7:** The round-trip probe must be time-boxed and must not fail the whole endpoint if the *probe table* is missing but the datastore is otherwise reachable — report that distinctly, since it indicates an unapplied migration.
- **FR-8:** Version all schema changes; any later change ships as a new migration file rather than an edit.
- **FR-9:** Keep the root package at zero runtime dependencies. This is achievable with `fetch` and the existing hand-rolled patterns; do not add a Supabase client library.
- **FR-10:** Extend the existing `verify` command to include the schema/code consistency check from US-003.

## 6. Non-Goals

- **Migrating existing data.** This PRD changes how the backend is *chosen* and *verified*, not what is in it. No backfill of `data/*.jsonl` into Supabase.
- **Replacing the JSONL backend in development.** It stays, because it keeps the test suite dependency-free.
- **Changing the storage abstraction for the frontend.** `web-new/` talks only to the HTTP API.
- **Adding RLS policies that grant access.** RLS is enabled to deny, not to enable.
- **Introducing an ORM, query builder, or migration framework.** Plain SQL files and `fetch` are sufficient for five tables.
- **Refactoring `handler.mjs`'s size** (tracked separately as `MED-06`).
- **Retrofitting audit logging** on data access.

## 7. Technical Considerations

- **Production runtime.** `api/gateway.js` runs as a Vercel Node serverless function, so the working directory is effectively read-only and per-invocation. Writing to `data/` there produces a file that later requests cannot rely on. This is the mechanism behind the US-004 risk.
- **`service_role` handling.** The key must be read only from the environment and never logged, echoed in health output, or returned in an error body. A Supabase error response can echo table and column names, so FR-5 requires narrowing it to a status plus a caller-facing message.
- **Probe-table choice.** The sentinel must not pollute `leads` or `clients`. A dedicated table is cleanest, but it means the probe fails on a deploy with migrations unapplied — FR-7 exists so that failure mode reads as "migration missing" rather than "database down".
- **Cache.** Guard the probe behind a process-level timestamp. Lambda instances are short-lived, so this mainly protects against bursts within one instance.
- **Test strategy.** The existing suite exercises the JSONL path. New tests should cover: partially configured pairs, production-mode refusal, write-failure propagation, and health-shape assertions. Supabase paths must be tested against a stubbed `fetch`, not a live project — **no test may require network access or real credentials.**
- **Ordering.** US-003 (schema) should land before US-002's round-trip probe, because the probe depends on the sentinel table existing.

## 8. Success Metrics

- A deploy with `SUPABASE_*` unset in production fails at the first write rather than absorbing it. Verified by deploying to a preview with the variables removed.
- `/api/health` returns `datastore.backend: "supabase"` on the production deployment. Verified by `curl` against production after rollout.
- `/api/health` returns 503 when the datastore is deliberately misconfigured. Verified on a preview deploy.
- The schema/code consistency test fails when a column is added to code but not to a migration. Verified by making that exact change and watching it fail.
- The test count grows from 89 with no pre-existing test modified to accommodate a behaviour change.
- The uptime automation reports the backend in use on every run.

## 9. Open Questions

1. **Is Supabase intended to be the production backend at all?** `.env.example:33` documents the dual-backend choice as deliberate, and `.mcp.json` points at project `rnlgwckkpjvtmtsowkrj`, but I cannot read Vercel's environment variables to confirm what production actually uses. The answer decides whether US-001's production refusal is the right behaviour or whether the JSONL path is the real intended design and needs different treatment.
2. **Who owns the Supabase project?** If migrations are to be applied, someone needs console access. Unresolved access would block US-003.
3. **Should a write failure be a 500 to the visitor, or a 200 with an operator alert?** A 500 is honest but costs the lead if the failure is transient. The current code deliberately persists before notifying mail, so as not to lose leads to a mail outage; the same reasoning might argue for buffering rather than failing. This needs a product decision.
4. **Should the probe run at all when the backend is JSONL in development?** A round-trip probe on a local file is cheap, but writing sentinel records into `data/` during local runs is mildly annoying.
5. **Is the ~320 KB of `data/*.jsonl` in the working tree mirrored anywhere?** If it is the only copy of real leads, US-005 must be sequenced carefully so nothing is lost. Current contents, for reference: `clients.jsonl` 514 records, `quiz-audits.jsonl` 342, `tickets.jsonl` 76, `ops-events.jsonl` 38.

---

## Definition of Done

- [ ] `npm run verify` passes (tests, build, lint).
- [ ] New tests cover partial configuration, production refusal, write-failure propagation, and health response shape.
- [ ] No test requires network access or a live Supabase project.
- [ ] Root `package.json` still declares zero runtime dependencies.
- [ ] `AGENTS.md` documents the backend resolver and the production refusal behaviour.
- [ ] Preview deploy verified with `SUPABASE_*` unset, confirming a loud failure.
- [ ] PR body notes that the schema migration has not been applied to production.
