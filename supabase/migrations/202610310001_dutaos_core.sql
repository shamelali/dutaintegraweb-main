-- DutaOS core tables (v1).
--
-- companies: one row per registered business. Multi-tenant root.
-- company_members: links users to companies with roles.
-- compliance_items: checklist items per company (SSM, PDPA, e-invoice, tax).
--
-- The server writes with the service role, which bypasses RLS and needs no
-- policy, so there are deliberately no policies here: anon and authenticated
-- can neither read nor write. Correct for a staff-internal platform.

create table if not exists public.companies (
  id uuid primary key,
  name text not null,
  ssm_number text,
  industry text,
  address text,
  email text not null,
  phone text,
  subscription_tier text not null default 'starter',
  subscription_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create table if not exists public.company_members (
  id uuid primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

alter table public.company_members enable row level security;

create index if not exists company_members_company_idx on public.company_members(company_id);
create index if not exists company_members_user_idx on public.company_members(user_id);

create table if not exists public.compliance_items (
  id uuid primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null,
  status text not null default 'pending',
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.compliance_items enable row level security;

create index if not exists compliance_items_company_idx on public.compliance_items(company_id);
