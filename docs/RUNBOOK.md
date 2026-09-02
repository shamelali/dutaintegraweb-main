# Runbook — Autonomous Operations

## Daily (automated)
- 08:00 MYT `daily-tasks` posts checklists to Slack (#leads / #ops). If missing: check `SLACK_WEBHOOK_URL` + Vercel Cron logs.
- 08:30 MYT `digest` emails + Slacks yesterday's leads, warm audits, stalled. If degraded: check `RESEND_API_KEY`, `EMAIL_TO`, Supabase.

## On New Lead
1. Slack `#leads` gets `:inbox_tray: New Lead` (from `/api/send-email`).
2. Dashboard `/admin` shows scored + assigned (Shamel/Amar). Filter by `new`.
3. Reply within 1 business day; update status → `contacted` (PATCH /api/admin/leads).

## Stale Lead Recovery
- Mon 09:30 MYT Slack alert lists 7d+ idle (`new` or `contacted`). Action: WhatsApp + update status.

## Audit Follow-up
- `followup` cron sends nudge 36h after audit to those with email and score. Verify: `audit_reports.followup_sent_at`.

## Incidents
- **Email not sending**: hit `/api/health` → `checks.resend.ok`. Re-check `RESEND_API_KEY`, `EMAIL_FROM` verified domain.
- **Leads not appearing**: check Supabase RLS (anon INSERT policy), `SUPABASE_URL/ANON_KEY`, Vercel logs for `lead persist failed`.
- **Slack silent**: check webhook URL, Vercel env `SLACK_WEBHOOK_URL`, cron logs.
- **Turnstile fails**: set `TURNSTILE_SECRET_KEY` correctly; dev bypasses if unset.
- **Auth fails**: ensure `JWT_SECRET` set (same across deploys), `ADMIN_USERS` JSON valid.

## Manual Triggers
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://dutaintegra.my/api/cron?job=digest
curl https://dutaintegra.my/api/health | jq
```

## Deploys
```bash
vercel --prod   # deploys root (vercel.json outputDirectory: ".")
```
Env vars: set via `vercel env add <KEY>` (RESEND_API_KEY, SUPABASE_*, JWT_SECRET, CRON_SECRET, SLACK_WEBHOOK_URL, TURNSTILE_SECRET_KEY, ALLOWED_ORIGINS).

## Migrations
Run `supabase/migrations/*.sql` in Supabase SQL editor (or `supabase db push`). Latest hardening: `20260902_hardening.sql` tightens RLS + adds indexes.
