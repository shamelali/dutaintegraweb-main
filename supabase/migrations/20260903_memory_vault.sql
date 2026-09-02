-- 20260903_memory_vault.sql — OpenHuman-inspired Markdown vault (git-first, Supabase-backed)
-- Idempotent. Run via Supabase SQL Editor or `supabase db push`.
-- Follows product-images bucket precedent in supabase/migrations.sql:93
-- Supports two deployment modes:
--   1) git-tracked memory/vault/ (MVP, Vercel static, no RLS needed)
--   2) Supabase Storage bucket memory-vault (scalable, service_role only)
-- This migration sets up (2) so it is ready; (1) works without it.

-- ---------------------------------------------------------------------------
-- 1) Storage bucket for vault Markdown (private, service_role only)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory-vault', 'memory-vault', false)
ON CONFLICT (id) DO NOTHING;

-- Ensure RLS on storage.objects (default). No anon policies on memory-vault.
-- Reads/writes require SUPABASE_SERVICE_ROLE_KEY via lib/supabase.js:20 getAdminSupabase
-- Explicitly ensure no public read policy leaks for memory-vault.
DROP POLICY IF EXISTS "public read memory vault" ON storage.objects;
-- Do NOT create a public read policy for memory-vault. Service role bypasses RLS.
-- For debug, service_role can SELECT via storage API with service key.

-- ---------------------------------------------------------------------------
-- 2) memory_sync_state — checkpoint cursors (like OpenHuman per-(toolkit,connection) state)
-- Tracks last successful synthesis per scope: leads, daily, companies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memory_sync_state (
  id text PRIMARY KEY, -- e.g. 'leads', 'daily:2026-09-03', 'companies:lapango'
  cursor timestamptz,       -- last processed created_at cursor
  last_sync timestamptz NOT NULL DEFAULT now(),
  dedup jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE memory_sync_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_memory_sync" ON memory_sync_state;
CREATE POLICY "service_role_all_memory_sync" ON memory_sync_state
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
-- No anon/authenticated policies — writes only via service_role from api/cron and api/send-email

CREATE INDEX IF NOT EXISTS idx_memory_sync_last_sync ON memory_sync_state (last_sync DESC);

-- ---------------------------------------------------------------------------
-- 3) Helper view for FTS over vault frontmatter (optional, for admin search)
-- Uses pg_trgm already enabled in schema.sql:7 (CREATE EXTENSION pg_trgm)
-- ---------------------------------------------------------------------------
-- No materialized view yet — keep lightweight. Admin can query leads table gin_trgm indexes
-- schema.sql:31 idx_leads_search instead. View added when vault >1k files.

-- ---------------------------------------------------------------------------
-- 4) Note: git-tracked fallback requires no DB changes.
--    Run `mkdir -p memory/vault/{leads,companies,daily}` in repo for local dev.
-- ---------------------------------------------------------------------------
