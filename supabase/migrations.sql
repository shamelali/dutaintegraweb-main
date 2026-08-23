-- ============================================================================
-- Duta Integra — migration: audit reports, events, lead scoring
--
-- Run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards).
-- ============================================================================

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

DROP POLICY IF EXISTS "public read product images" ON storage.objects;
CREATE POLICY "public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- Uploads happen server-side via SUPABASE_SERVICE_ROLE_KEY (bypasses RLS),
-- so no INSERT policy for anon is intentionally defined here.

