# Database schema

Plain SQL, applied in filename order. There is no ORM and no migration
framework — the root package has zero runtime dependencies and that is not
changing for five tables.

## Layout

| File | What it creates |
|---|---|
| `migrations/202610250001_workspace_phase4.sql` | Portal workspace: `clients`, `portal_sessions`, `workspace_leads`, `workspace_assessments`, `workspace_proposals`, projects/tasks/approvals/activity, RLS on |
| `migrations/202610270001_core_tables.sql` | Marketing/lead-capture core: `leads`, `clients`, `tickets`, `ticket_replies`, `monthly_digests`, `quiz_audits`, `events`, `allowed_cidrs`, `audit_reports`, `case_studies`, `products`, `proposal_versions`, `audit_log`, RLS on |
| `migrations/202610280001_health_probe_and_rls_fix.sql` | `health_probe` (the `/api/health` round-trip sentinel) and drops two policies that granted role `public` read access to `proposal_versions` and `audit_log` |

## Applying

Either through the Supabase SQL editor, one file at a time in filename order,
or with the CLI against the project in `.mcp.json`:

```bash
supabase db push --project-ref rnlgwckkpjvtmtsowkrj
```

Migrations are append-only. Never edit a file that has been applied anywhere —
ship a new one with the next timestamp. `npm test` enforces the ordering and
the naming pattern.

## How the code chooses this database

`server/store.mjs` resolves the backend once per request:

| `SUPABASE_URL` | `SUPABASE_SERVICE_ROLE_KEY` | Result |
|---|---|---|
| set | set | Supabase |
| set | unset | **error**, in every environment |
| unset | set | **error**, in every environment |
| unset | unset | JSONL in `data/` — and an error when `NODE_ENV=production` |

The half-configured case is an error rather than a silent fallback because the
fallback writes customer PII to a file that a serverless redeploy discards.
Locally, unset **both** variables to use the JSONL store.

## Verifying the schema matches the code

```bash
node --test server/schema.test.mjs
```

That file reads `server/` and these migrations and fails when:

- code writes to a table no migration creates;
- code filters on, or selects, a column the table does not declare;
- a table exists without `enable row level security`;
- a `create policy` omits a `to <role>` clause — which silently grants access
  to role `public`, and `anon` and `authenticated` both inherit that;
- migration filenames are out of order or renamed.

It is part of `npm test`, so `npm run verify` and CI both run it.

## Keys

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. It stays server-side: never
`VITE_`-prefixed, never in a client bundle, never in a response body or log
line. `server/scan-secrets.test.mjs` and the `secret-scan` CI job exist to catch
that; `/api/health` is written to never echo provider error bodies, because
those name tables and columns.
