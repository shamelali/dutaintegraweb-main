-- Catalog items captured via image-to-VLM enrichment (/api/catalog/*).
--
-- One row per product photographed by a customer or staff member. The server
-- writes with the service role, which bypasses RLS and needs no policy, so
-- there are deliberately no policies here: anon and authenticated can neither
-- read nor write, which is correct for a staff-internal catalog.

create table if not exists public.catalog_items (
  id uuid primary key,
  title text,
  description text,
  category text,
  specs jsonb not null default '{}',
  tags text[] not null default '{}',
  image_url text,
  source_image text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catalog_items enable row level security;
