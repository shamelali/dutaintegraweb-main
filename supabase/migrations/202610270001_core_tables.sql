-- Core marketing/lead-capture/storage schema for dutaintegra.my.
-- Derived from the Supabase project's actual tables (no schema file existed before).
-- Apply through Supabase SQL Editor or your migration pipeline before enabling APIs.
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  service text,
  message text,
  status text not null default 'new',
  source text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  lead_score integer not null default 0,
  industry text,
  assigned_role text,
  emailed_at timestamptz,
  user_agent text,
  ip text
);
create index if not exists leads_status_created_idx on public.leads(status, created_at desc);
create index if not exists leads_email_idx on public.leads(lower(email));

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  company text,
  tier text,
  status text,
  created_at timestamptz default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  subject text not null,
  description text,
  status text,
  priority text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create table if not exists public.monthly_digests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  month text not null,
  sent_at timestamptz,
  content_json jsonb
);

create table if not exists public.quiz_audits (
  id uuid primary key default gen_random_uuid(),
  team_size integer,
  it_spend integer,
  pain_points text[],
  tier text,
  score integer,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigserial primary key,
  type text not null,
  path text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.allowed_cidrs (
  id bigserial primary key,
  cidr_range cidr not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_reports (
  id uuid primary key default gen_random_uuid(),
  share_slug text not null unique,
  url text not null,
  domain text not null,
  brand_name text,
  industry text,
  email text,
  score integer not null,
  grade text,
  report jsonb not null,
  followup_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.case_studies (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  category text,
  summary_en text,
  summary_ms text,
  image_url text,
  metrics jsonb not null default '{}'::jsonb,
  outcomes jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  detail_url text,
  status text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  category text,
  description_en text,
  description_ms text,
  tags jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '[]'::jsonb,
  preview_url text,
  image_url text,
  contact_cta_en text,
  contact_cta_ms text,
  status text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Service-role only; RLS enabled.
alter table public.leads enable row level security;
alter table public.clients enable row level security;
alter table public.tickets enable row level security;
alter table public.monthly_digests enable row level security;
alter table public.quiz_audits enable row level security;
alter table public.events enable row level security;
alter table public.allowed_cidrs enable row level security;
alter table public.audit_reports enable row level security;
alter table public.case_studies enable row level security;
alter table public.products enable row level security;
