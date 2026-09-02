# Architecture — Duta Integra Web (Enterprise Grade)

## Overview
Static HTML (Vercel `outputDirectory: "."`) + 5 serverless functions (Hobby limit) + Supabase + Resend + Slack + Turnstile.

```
Browser ──→ Vercel Edge (CSP, redirects, headers)
          ├─→ /api/send-email (contact pipeline: validate → email → lead → slack → autoreply)
          ├─→ /api/audit (fetch & score external site, persist report, email, lead upsert)
          ├─→ /api/public (products, caseStudies, report, track, health) — cached 30s
          ├─→ /api/admin (login, leads, audits, products, caseStudies, slack) — auth required
          └─→ /api/cron (followup, daily-tasks, digest, stale-leads) — x-vercel-cron or Bearer CRON_SECRET
Supabase: leads, audit_reports, events, products, case_studies, storage:product-images
```

## Function Consolidation (Hobby 12-function cap)
`vercel.json` rewrites map 15+ logical routes onto 5 physical functions:
- `api/public.js` → products, case-studies, report, track, health
- `api/admin.js` → login, leads, audits, products, case-studies, slack
- `api/cron.js` → followup, daily-tasks, digest, stale-leads
- `api/audit.js` → audit
- `api/send-email.js` → contact pipeline

## Module Layout
```
lib/               shared enterprise lib (outside api/ so Vercel does NOT treat each file as a function)
  config.js      env parsing & validation (ALLOWED_ORIGINS, JWT_SECRET, etc)
  logger.js      structured JSON logger (requestId, level, ts)
  errors.js      AppError taxonomy + http mapping
  validate.js    sanitize, sanitizeHTML, isEmail, validateContactPayload
  security.js    isPrivateHost (SSRF), timingSafeEqual
  rate-limit.js  sliding window limiter (pluggable to Redis)
  cors.js        getAllowedOrigin (exact match, no startsWith), json(), corsResponse()
  supabase.js    getSupabase() / pingSupabase()
  auth.js        hmacSign, verifyAdminToken (constant-time), createToken, isCronAuthorized
  email.js       sendAdminNotification, sendAutoreply (Resend emails.send)
  slack.js       postToSlack (retry, soft-fail)
  events.js      trackEvent bus (events table + webhook fanout placeholder)
api/
  _lib.js          facade — re-exports ../lib/* for backwards compat
  _scoring.js      lead_score + assigned_role (technical/operations)
  _tasks.js        DAILY_TASKS source of truth (Slack cron + admin UI must stay synced)
```

## Data Flow — Autonomous Business Loop
1. **Capture** — contact form POST /api/send-email (Turnstile + honeypot + rate limit). Server validates, scores via `scoreLead`, inserts `leads` (with dedup 5-min window), sends admin email, Slack, autoreply, logs `lead_created` event.
2. **Audit funnel** — POST /api/audit fetches target site (SSRF-guarded), scores 4 categories, persists `audit_reports` (share_slug), upserts `leads` (source=free-audit), logs `audit_run`, emails report.
3. **Nurture** — cron/followup (36h–7d old audits, no followup_sent_at) sends top-2 fixes email + stamps followup_sent_at (idempotent).
4. **Ops cadence** — cron/daily-tasks 08:00 MYT posts both role checklists to Slack; digest 08:30 MYT aggregates new/warm/stalled; stale-leads Mon 09:30 MYT surfaces 7d+ idle leads.
5. **Manage** — admin dashboard (JWT Bearer, 24h) CRUD leads/products/caseStudies, CSV export.
6. **Observe** — /api/health checks DB+Resend+Slack; structured logs ingestable by Vercel drains / Datadog.

## Security Posture
- `httpOnly` not used (localStorage JWT) — acceptable for low-risk admin panel with 24h expiry + constant-time compare + rate limit (10/min login). Future: move to httpOnly cookie + CSRF.
- RLS: audit_reports & events service_role-only (no anon SELECT); leads anon INSERT-only; products/case_studies public read published-only. See `supabase/migrations/20260902_hardening.sql`.
- SSRF: `isPrivateHost` blocks RFC1918, link-local, loopback before fetch.
- CSP: `default-src 'self'`, no `unsafe-eval`, frame-ancestors none, base-uri self.
- Headers: HSTS (63072000, preload), X-Frame DENY, nosniff, Permissions-Policy locked.

## Scaling Notes
- Rate limit is per-isolate in-memory; for multi-region strictness, replace with Upstash Redis (env flag).
- Product/caseStudies caches are 30s in-memory; for ISR at scale add Vercel KV or CDN revalidate.
- To add new cron: add handler in `api/cron.js` + rewrite in `vercel.json` + schedule in `crons[]` (no new function).
