# Duta Integra Phase 4 — Unified Workspace (Phase 2 + Phase 3 + DutaSuite)

## What this release adds

- `/digital-assessment`: responsive business digital-readiness assessment with validated inputs, a readiness indicator and actionable recommendations.
- `/workspace`: client sign-in, proposal review/decision, project status, and project task visibility.
- `/operations`: internal staff console for assessment leads, proposals, projects, tasks, human approvals and activity history.
- `server/workspace-cloudflare.mjs`: Supabase-backed API for assessment intake, lead pipeline, proposals, projects, tasks, human approvals and activity history.
- Durable portal sessions: session tokens are random, only SHA-256 hashes are stored in `portal_sessions`, expiry is checked server-side, and logout revokes the token. This replaces the per-process `Map` session store.
- Proposal acceptance creates a planned project and records activity. Staff APIs can create/update proposals, projects, tasks, and approval decisions.
- All new workspace tables have Row Level Security enabled. These routes use the service-role key server-side only; never expose it to the frontend.
- Merge conflict markers in the tracked text/source files from the supplied snapshot have been resolved. The email provider order remains Brevo → Resend → Postmark.

## Apply before deployment

1. Back up the Supabase project and verify the existing `public.clients` table and `public.leads` table are present. The current site already depends on `clients`; this migration adds the new workspace tables and durable sessions.
2. Apply `supabase/migrations/202610250001_workspace_phase4.sql` using the Supabase SQL Editor or your established migration workflow.
3. Confirm Cloudflare Pages server-side environment variables are configured:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
   - `ADMIN_TOKEN` (strong random secret; server-side only)
4. Keep the service-role key and `ADMIN_TOKEN` out of `web-new`, `public`, client-side JavaScript, and committed `.env` files.
5. Build the frontend with `npm --prefix web-new ci && npm --prefix web-new run build`, then run `node scripts/sync-web.mjs`.
6. Run `npm test`, `npm run scan:secrets`, and `npm run lint:web` in a connected development environment. The frontend dependency installation could not be completed in the offline verification environment used for this package, so the React build must still be verified before deployment.
7. Deploy to a non-production Cloudflare Pages preview first and test assessment submission, client login, proposal decision, project creation, task visibility, logout/session expiry and unauthorized access.

## API overview

### Public intake

`POST /api/workspace/assessments`

Required JSON fields: `name`, `company`, `email`, `industry`, `teamSize`, `digitalMaturity` (integer 1–5), `priorities` (one or more of `sales`, `automation`, `security`, `ai`, `operations`, `customer-experience`, `data`), `budgetRange`, and `timeline`. Optional fields: `phone`, `notes`.

The endpoint stores a row in `workspace_leads` and a linked result in `workspace_assessments`. A light per-instance rate limit is included; configure Cloudflare WAF/rate limiting for robust edge-wide abuse protection.

### Client workspace

- `POST /api/portal/login` — existing client account login; now creates a durable database-backed session.
- `POST /api/portal/logout` — revokes the current session.
- `GET /api/workspace/client` — returns only the signed-in client's proposals, projects and related tasks.
- `POST /api/workspace/proposals/:id/decision` — body `{ "decision": "accepted" }` or `{ "decision": "declined" }`; only proposals belonging to the authenticated client and still in `sent` status can be decided.

### Staff/admin API

Staff routes accept `x-admin-token: <ADMIN_TOKEN>` for server-to-server administration. The `/operations` console authenticates with the token once, then receives a one-hour signed, HttpOnly, Secure, SameSite=Strict cookie; the token is not stored in browser storage. Protect `/operations` and `/api/workspace/admin/*` with Cloudflare Access and edge rate limiting before broad staff use. Do not embed the admin token in frontend code or send it from general website pages.

- `POST /api/workspace/admin/login` — exchange `ADMIN_TOKEN` for a one-hour HttpOnly operations cookie
- `GET /api/workspace/admin/me` — validate the operations session
- `POST /api/workspace/admin/logout` — clear the operations cookie
- `GET /api/workspace/admin/leads`
- `PATCH /api/workspace/admin/leads/:id` — `{ "status": "qualified" }` (allowed values: `new`, `qualified`, `proposal`, `won`, `lost`, `archived`)
- `GET /api/workspace/admin/assessments`
- `GET|POST /api/workspace/admin/proposals`
- `PATCH /api/workspace/admin/proposals/:id` — link `clientId`, edit scope/amount/validity or change status
- `GET|POST /api/workspace/admin/projects`
- `PATCH /api/workspace/admin/projects/:id`
- `GET|POST /api/workspace/admin/tasks`
- `PATCH /api/workspace/admin/tasks/:id`
- `GET|POST /api/workspace/admin/approvals`
- `POST /api/workspace/admin/approvals/:id/decision` — `{ "decision": "approved" }` or `{ "decision": "rejected", "notes": "..." }`
- `GET /api/workspace/admin/activity`

Example proposal create body:

```json
{
  "leadId": "<workspace_lead_uuid>",
  "clientId": "<existing_client_uuid>",
  "title": "SME Digital Operations Starter",
  "summary": "Discovery, process mapping and a prioritised implementation plan.",
  "scope": ["Discovery workshop", "Workflow map", "Implementation roadmap"],
  "amountMyr": 3500,
  "validUntil": "2026-12-31",
  "status": "sent"
}
```

If `clientId` is omitted, proposal creation attempts to match the assessment lead email to an existing client account. If no client account exists yet, create/provision one first and then link the proposal with the admin PATCH endpoint. Never assume an assessment lead has been authenticated as a client just because the email matches.

## Security and operational notes

- Existing client accounts must already be provisioned; this release does not add public self-registration or password reset.
- Staff operations currently use a server-side `ADMIN_TOKEN`. The token is suitable for server-to-server use only. A user-facing staff console should be added behind Cloudflare Access with identity/role checks before broad staff adoption.
- The per-instance assessment and admin-login rate limits are secondary safeguards, not a substitute for Cloudflare edge rate limiting.
- Assessment scoring is an indicative self-assessment, not an automated security audit or assurance of ROI.
- Proposal acceptance creates a planned project record. It does not constitute a signed contract, collect payment, or confirm a delivery date.
- Production database migration and real-browser testing have not been run as part of this ZIP build.
