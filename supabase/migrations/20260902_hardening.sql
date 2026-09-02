-- 20260902_hardening.sql — enterprise RLS hardening + autonomous business indexes
-- Run via Supabase CLI or SQL editor. Idempotent.

-- ---------------------------------------------------------------------------
-- 1) Audit reports — revoke overly-permissive anon read (coalesces PII leak)
-- API reads via service_role (api/public report + api/audit persist) so no
-- direct anon SELECT needed. Keep service_role full access, revoke anon.
-- ---------------------------------------------------------------------------
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read audit reports" ON audit_reports;
-- No anon SELECT policy: anon cannot enumerate audit_reports via PostgREST.
-- Service role still bypasses RLS for api/public and api/audit.
-- If you need share-link reads via anon, re-enable with:
-- CREATE POLICY "anon read by share_slug" ON audit_reports FOR SELECT USING (true);
-- but prefer service_role-only for PII minimization.

-- ---------------------------------------------------------------------------
-- 2) Events — already RLS enabled with no anon policies (service_role only) — ensure state
-- ---------------------------------------------------------------------------
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3) Leads — ensure anon can only INSERT (not SELECT/UPDATE/DELETE)
-- Existing policies: service_role ALL, anon INSERT, authenticated SELECT.
-- Tighten: drop overly broad policies if present, re-create minimal set.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for service role" ON leads;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND policyname = 'service_role_all_leads'
  ) THEN
    CREATE POLICY "service_role_all_leads"
      ON public.leads
      FOR ALL
      TO service_role
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

-- Ensure anon cannot read leads (PII)
DROP POLICY IF EXISTS "Allow select for authenticated" ON leads;
-- keep authenticated SELECT only if you use Supabase Auth for admin dashboard;
-- dashboard now uses service_role via API, so no direct PostgREST SELECT needed.
-- Optionally allow authenticated read for future:
-- CREATE POLICY "authenticated_read_leads" ON leads FOR SELECT USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 4) Indexes for autonomous pipeline (scoring, stale detection, digest)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leads_email_created ON leads (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status_updated ON leads (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_role_status ON leads (assigned_role, status);
CREATE INDEX IF NOT EXISTS idx_audit_reports_email_score ON audit_reports (email, score) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_reports_domain ON audit_reports (domain);
CREATE INDEX IF NOT EXISTS idx_events_meta_gin ON events USING gin (meta);

-- ---------------------------------------------------------------------------
-- 5) Products / case_studies — ensure public read limited to published only
-- (already correct, keep as is; ensure anon cannot write)
-- ---------------------------------------------------------------------------
-- No anon INSERT policies exist — writes require service_role via API.

-- ---------------------------------------------------------------------------
-- 6) Add updated_at trigger helper for products/case_studies if missing
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_case_studies_updated ON case_studies;
CREATE TRIGGER trg_case_studies_updated BEFORE UPDATE ON case_studies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
