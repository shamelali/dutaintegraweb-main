-- Duta Integra Phase 2/3/4 unified workspace schema.
-- Apply through Supabase SQL Editor or your migration pipeline before enabling APIs.
create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text,
  company text,
  tier text not null default 'foundation',
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clients enable row level security;

create table if not exists public.portal_sessions (
  token_hash text primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists portal_sessions_client_idx on public.portal_sessions(client_id);
create index if not exists portal_sessions_expiry_idx on public.portal_sessions(expires_at);

create table if not exists public.workspace_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  phone text,
  industry text not null,
  team_size text not null,
  digital_maturity integer not null check (digital_maturity between 1 and 5),
  priorities text[] not null default '{}',
  budget_range text not null,
  timeline text not null,
  notes text,
  source text not null default 'digital-assessment',
  status text not null default 'new' check (status in ('new','qualified','proposal','won','lost','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_leads_status_created_idx on public.workspace_leads(status, created_at desc);
create index if not exists workspace_leads_email_idx on public.workspace_leads(lower(email));

create table if not exists public.workspace_assessments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.workspace_leads(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  maturity_label text not null,
  answers jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists workspace_assessments_lead_idx on public.workspace_assessments(lead_id, created_at desc);

create table if not exists public.workspace_proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.workspace_leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  summary text not null,
  scope jsonb not null default '[]'::jsonb,
  amount_myr numeric(12,2) not null check (amount_myr >= 0),
  valid_until date,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists workspace_proposals_client_idx on public.workspace_proposals(client_id, created_at desc);
create index if not exists workspace_proposals_lead_idx on public.workspace_proposals(lead_id, created_at desc);

create table if not exists public.workspace_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  proposal_id uuid references public.workspace_proposals(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'planned' check (status in ('planned','active','on_hold','completed','cancelled')),
  start_date date,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_projects_client_idx on public.workspace_projects(client_id, created_at desc);

create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workspace_projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  due_date date,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspace_tasks_project_idx on public.workspace_tasks(project_id, status, due_date);

create table if not exists public.workspace_approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workspace_projects(id) on delete cascade,
  task_id uuid references public.workspace_tasks(id) on delete set null,
  title text not null,
  details text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_by text,
  decided_by text,
  decision_notes text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists workspace_approvals_project_idx on public.workspace_approvals(project_id, status, created_at desc);

create table if not exists public.workspace_activity (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('client','staff','system')),
  actor_id text,
  entity_type text not null,
  entity_id text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists workspace_activity_entity_idx on public.workspace_activity(entity_type, entity_id, created_at desc);

-- These tables are accessed through server-side service-role APIs only.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY in frontend bundles.
alter table public.portal_sessions enable row level security;
alter table public.workspace_leads enable row level security;
alter table public.workspace_assessments enable row level security;
alter table public.workspace_proposals enable row level security;
alter table public.workspace_projects enable row level security;
alter table public.workspace_tasks enable row level security;
alter table public.workspace_approvals enable row level security;
alter table public.workspace_activity enable row level security;
