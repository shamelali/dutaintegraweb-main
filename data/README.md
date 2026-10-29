# Local JSONL stores — development only

Every file here is the **fallback** store that `server/store.mjs` picks only when
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both unset *and*
`NODE_ENV` is not `production`. On Vercel the function filesystem is ephemeral, so
anything written here in production is lost on the next cold start — which is why
that combination is a hard error rather than a silent fallback.

The directory's contents are gitignored (see `.gitignore`); only this README is
tracked. Do not commit anything else in here.

## What each file is

| File | Written by | Record shape |
|---|---|---|
| `enquiries.jsonl` | `server/enquiries.mjs` (`/api/contact`) | lead: id, name, company, email, phone, service, message, status, createdAt, ip |
| `clients.jsonl` | `server/clients.mjs` (portal accounts) | id, name, email, passwordHash (scrypt), company, tier, status, role, createdAt |
| `tickets.jsonl`, `ticket-replies.jsonl` | `server/tickets.mjs` | support tickets and replies, keyed by `clientId` |
| `digests.jsonl` | `server/digest.mjs` | monthly digest send log |
| `quiz-audits.jsonl` | `recordQuizAudit` in `server/handler.mjs` | team_size, it_spend, pain_points, tier, score, ip, user_agent |
| `case-studies.jsonl`, `products.jsonl` | `server/cms.mjs` | CMS content |
| `ops-events.jsonl`, `ops-consent.json` | `server/autonomous-ops.mjs` | anonymised feed events (region + industry only) and PDPA consent flags |

## Redirecting it

`DATA_DIR` moves every store at once (`server/paths.mjs`). `npm test` sets it to a
temporary directory, so the suite cannot append synthetic records into a file you
are using locally. `ENQUIRY_STORE` and `QUIZ_STORE` override a single store.

## Treat these files as scratch, not as a record of the business

They are not backed up, not migrated, and not a source of truth. Leads that matter
live in Supabase. If you find real customer data here, it means production is
running on the fallback — that is the condition `/api/health` now answers 503 for,
and the `DI uptime + deploy-integrity watch` pages on.
