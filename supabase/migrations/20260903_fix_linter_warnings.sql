-- 20260903_fix_linter_warnings.sql — remediate 3 Supabase database linter warnings
-- Idempotent. Run via Supabase SQL Editor or `supabase db push`.
-- See: https://supabase.com/docs/guides/database/database-linter
--
-- Linter warnings fixed:
--   0011_function_search_path_mutable  — set_updated_at()
--   0024_permissive_rls_policy         — anon INSERT on leads
--   0025_public_bucket_allows_listing — product-images SELECT on storage.objects

-- ---------------------------------------------------------------------------
-- 1) Fix: function_search_path_mutable (lint 0011)
-- ---------------------------------------------------------------------------
-- The set_updated_at() trigger function was created without an explicit
-- search_path. By default, PostgreSQL functions inherit the session's
-- search_path (mutable), which lets a malicious user create objects in a
-- schema that gets searched first — shadowing the intended function.
-- Fix: recreate with SET search_path = pg_catalog (only needs now()).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = pg_catalog
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Re-attach triggers (idempotent) so they continue to call the hardened function.
DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_case_studies_updated ON case_studies;
CREATE TRIGGER trg_case_studies_updated BEFORE UPDATE ON case_studies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Fix: rls_policy_always_true (lint 0024) — anon INSERT on leads
-- ---------------------------------------------------------------------------
-- The "Allow insert for anon" policy used WITH CHECK (true), letting anyone
-- insert arbitrary rows. Replaced with scoped validation so public submissions
-- still work but must contain non-empty name, valid email, non-empty service,
-- and a message within length limits.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow insert for anon" ON public.leads;
CREATE POLICY "Allow insert for anon" ON public.leads
  FOR INSERT
  WITH CHECK (
    length(name) > 0
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(service) > 0
    AND length(message) <= 5000
  );

-- ---------------------------------------------------------------------------
-- 3) Fix: public_bucket_allows_listing (lint 0025) — product-images SELECT
-- ---------------------------------------------------------------------------
-- The "public read product images" policy on storage.objects used
-- USING (bucket_id = 'product-images'), which allowed anon clients to LIST
-- every file in the bucket via PostgREST or the /storage/v1/object/list endpoint.
-- Object URLs (e.g. /storage/v1/object/public/product-images/<file>) still work
-- because the bucket itself is public (public: true) — that access is controlled
-- by the bucket flag, not this policy. Drop the broad SELECT policy to prevent
-- file enumeration while keeping public object URL access intact.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "public read product images" ON storage.objects;
