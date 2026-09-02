# API Reference

Base: `https://dutaintegra.my/api`

## POST /api/send-email
Contact pipeline — transactional: validate → Resend admin email → score & persist lead → Slack → autoreply.
- Body: `multipart/form-data` or `application/json` `{ name*, company, email*, phone, service*, message, lang, source, cf-turnstile-response }`
- Honeypot: `website-bot` (or `website`/`hp`) must be empty.
- Rate limit: 5/min/IP (`RATE_LIMIT_MAX` / `RATE_WINDOW`).
- Turnstile: verified if `TURNSTILE_SECRET_KEY` set.
- Returns: `200 { ok:true, success:true }` | `4xx { ok:false, error }`

## POST /api/audit
Fetch & score external site.
- Body: `{ url*, name, industry, email? }` — email optional but needed for report delivery + lead.
- Rate limit: 10/min/IP (`AUDIT_RATE_MAX`).
- SSRF-guarded, 9s fetch timeout, 1.8MB cap.
- Auth: `Authorization: Bearer <admin JWT>` → returns full `checks` array; otherwise `checks: []`.
- Returns: `200 { ok:true, report, shareSlug }` + persists `audit_reports` + upserts `leads` (free-audit) + emails report.
- Errors: `400 BAD_URL/BAD_HOST/NOT_HTML`, `504 TIMEOUT`.

## Public (via /api/public)
All `GET` except `track`.
- `GET /api/products` → `{ products: [...] }` (published only, 30s cache)
- `GET /api/case-studies` → `{ caseStudies: [...] }`
- `GET /api/report?slug=abc123` → `{ report }`
- `POST /api/track` → `{ type: page_view|preview_register|preview_click, path, meta }` (600/min global)
- `GET /api/health` → `{ status: healthy|degraded, checks: { db, resend, slack, supabase }, version, env }`

## Admin (via /api/admin, JWT required except login/leads POST)
- `POST /api/admin/login` `{ email, password }` → `{ token, user }` (10/min/IP)
- `GET /api/admin/leads?status=all|new|contacted|closed&q=search` → `{ leads, counts }`
- `POST /api/admin/leads` (anon allowed for contact form fallback; dedup 5-min by email+service)
- `PATCH /api/admin/leads?id=uuid` `{ status, note }`
- `GET /api/admin/audits` → `{ audits, stats }`
- `GET|POST|PATCH|DELETE /api/admin/products[?id=uuid][?upload=1]` (upload: multipart `file`)
- `GET|POST|PATCH|DELETE /api/admin/case-studies[?id=uuid]`
- `POST /api/slack` `{ text }` (via /api/admin?resource=slack) — proxies to Incoming Webhook.

## Cron (requires `x-vercel-cron` or `Authorization: Bearer $CRON_SECRET`)
- `GET /api/cron?job=followup` — 24h nudge for unsent audit_reports
- `GET /api/cron?job=daily-tasks` — posts both checklists to Slack 08:00 MYT
- `GET /api/cron?job=digest` — email+Slack digest 08:30 MYT (new/warm/stalled)
- `GET /api/cron?job=stale-leads` — weekly stale alert Mon 09:30 MYT
