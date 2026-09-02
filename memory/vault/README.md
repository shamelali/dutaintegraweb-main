# Memory Vault — OpenHuman-inspired synthesis layer

This folder is the human-readable mirror of Supabase `leads` + `audit_reports`.

## Structure (MYT — Asia/Kuala_Lumpur)

- `leads/<YYYY-MM-DD>__<id8>__<slug>.md` — source trees (one per lead, provenance `leads.id`)
- `companies/<slug>.md` — topic trees (aggregated per company/email)
- `daily/<YYYY-MM-DD>.md` — global trees (daily digest, score/role stats)

All files carry frontmatter with `provenance`, `lead_score`, `assigned_role` from `api/_scoring.js:58`.

## Edit policy

- **Raw sources** (`leads` table) are immutable append-only.
- **Vault files** are LLM-written, human-editable. Edit in place — next `api/cron.js:96` digest (08:30 MYT) reuses your edit, doesn't overwrite if you added notes.
- Retrieval searches vault first (`daily` → `companies` → `leads`), falls back to DB via `pg_trgm` `supabase/schema.sql:31`.

## Generation

- Per-lead: `api/send-email.js:147` after `supabase.from("leads").insert` (fire-and-forget, logs preview to `events:type=memory_lead_synthesized`).
- Daily fold: `api/cron.js:handleMemoryFold` queries last 7d leads `api/cron.js:103`, calls `lib/memory.js:synthesizeBatch` via `createFsVaultWriter` (git) or `createSupabaseVaultWriter` (bucket `memory-vault` in `supabase/migrations/20260903_memory_vault.sql:7`).

## Ops

- Disable: set `MEMORY_VAULT_ENABLED=false` in Vercel env (`lib/config.js:44`).
- Local dev: `npm test` validates `lib/memory.js` (`tests/lib/memory.test.js:1`).
- Supabase migration: run `supabase/migrations/20260903_memory_vault.sql` once in SQL Editor.

Inspired by TinyHumans `openhuman` Memory Tree + Karpathy Obsidian wiki pattern — reimplemented without GPL dependency.
