-- ============================================================================
-- Duta Integra — migration: audit reports, events, lead scoring
--
-- Run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards).
-- ============================================================================

-- Enable pg_trgm extension for trigram search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 1. audit_reports — stored free-brand-audit results, addressable by slug
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_slug       text UNIQUE NOT NULL,
  url              text NOT NULL,
  domain           text NOT NULL,
  brand_name       text,
  industry         text,
  email            text,
  score            int  NOT NULL CHECK (score BETWEEN 0 AND 100),
  grade            text,
  report           jsonb NOT NULL,
  followup_sent_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_reports_created ON audit_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_reports_followup ON audit_reports (followup_sent_at)
  WHERE followup_sent_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. events — first-party analytics + lead scoring feed
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type       text NOT NULL,          -- page_view | audit_run | preview_register | preview_click
  path       text,
  meta       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type_created ON events (type, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. leads — lead scoring column
-- ---------------------------------------------------------------------------
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score int NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry text;
-- P0 automation: ops-routing hint for the two admin roles
-- ('technical' = Shamel, 'operations' = Amar). Set server-side by
-- api/_scoring.js on insert (contact form + free audit).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_role text;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_role ON leads (assigned_role);
-- Surface the warmest, newest leads first in the admin dashboard.
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. products — Work page items, managed from the admin dashboard
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  tagline         text,
  category        text,
  description_en  text,
  description_ms  text,
  tags            jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics         jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview_url     text,
  image_url       text,
  contact_cta_en  text DEFAULT 'Discuss a similar build',
  contact_cta_ms  text DEFAULT 'Bincangkan binaan yang serupa',
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_published ON products (sort_order)
  WHERE status = 'published';

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read published products" ON products;
CREATE POLICY "public read published products" ON products
  FOR SELECT USING (status = 'published');

-- ---------------------------------------------------------------------------
-- 5. storage — product image uploads (public read)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- NOTE: No SELECT policy on storage.objects for product-images.
-- The bucket is public (public: true), so object URLs work via the bucket flag
-- without needing a broad SELECT policy. A SELECT policy would allow anon
-- clients to list all files in the bucket (file enumeration). See lint 0025.
-- If you need to allow listing, add a more restrictive policy, but for public
-- object URL access, it is not needed.

-- Uploads happen server-side via SUPABASE_SERVICE_ROLE_KEY (bypasses RLS),
-- so no INSERT policy for anon is intentionally defined here.

-- ---------------------------------------------------------------------------
-- 6. RLS posture — explicit, regardless of project-level defaults.
--
-- Some projects enable RLS on every new table. Server-side API routes write
-- with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS), so anon gets read access
-- ONLY where the public site needs it. No anon INSERT anywhere: that path
-- goes through our rate-limited serverless functions, not raw PostgREST.
-- ---------------------------------------------------------------------------

ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read audit reports" ON audit_reports;
CREATE POLICY "anon read audit reports" ON audit_reports
  FOR SELECT USING (true);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- No policies: writes happen only via the service key from our API routes.

-- ---------------------------------------------------------------------------
-- 7. case_studies — cards on /cases, managed from the admin dashboard.
--    Long-form detail pages stay static (/cases/<slug>.html) and are linked
--    via detail_url for SEO.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_studies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name   text NOT NULL,
  category      text,
  summary_en    text,
  summary_ms    text,
  image_url     text,
  metrics       jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcomes      jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags          jsonb NOT NULL DEFAULT '[]'::jsonb,
  detail_url    text,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_studies_published ON case_studies (sort_order)
  WHERE status = 'published';

ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read published case studies" ON case_studies;
CREATE POLICY "public read published case studies" ON case_studies
  FOR SELECT USING (status = 'published');

