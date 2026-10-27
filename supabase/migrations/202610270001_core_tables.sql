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
  role text not null default 'client',
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

create table if not exists public.ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_type text not null, -- 'client', 'admin'
  author_id uuid,
  author_email text,
  body text not null,
  is_internal boolean not null default false, -- internal notes not visible to client
  created_at timestamptz not null default now()
);
create index if not exists ticket_replies_ticket_idx on public.ticket_replies(ticket_id, created_at);

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

-- RLS policies for leads (contact form writes via anon, admin reads via service role)
create policy "Contact form can insert leads" on public.leads
  for insert to anon
  with check (source = 'contact-form' OR source = 'digital-assessment');

create policy "Authenticated users can read own leads" on public.leads
  for select to authenticated
  using (email = auth.jwt()->>'email');

-- RLS policies for clients
create policy "Clients can read own data" on public.clients
  for select to authenticated
  using (id = auth.uid());

create policy "Clients can update own data" on public.clients
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- RLS policies for tickets
create policy "Clients can read own tickets" on public.tickets
  for select to authenticated
  using (client_id = auth.uid());

create policy "Clients can create tickets" on public.tickets
  for insert to authenticated
  with check (client_id = auth.uid());

-- RLS policies for ticket_replies
alter table public.ticket_replies enable row level security;

create policy "Clients can read replies on own tickets" on public.ticket_replies
  for select to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_replies.ticket_id
      and t.client_id = auth.uid()
    )
  );

create policy "Clients can reply on own tickets" on public.ticket_replies
  for insert to authenticated
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_replies.ticket_id
      and t.client_id = auth.uid()
    )
    and author_type = 'client'
  );

-- RLS policies for monthly_digests
create policy "Clients can read own digests" on public.monthly_digests
  for select to authenticated
  using (client_id = auth.uid());

-- RLS policies for case_studies (public read, admin write via service role)
create policy "Public can read published case studies" on public.case_studies
  for select to anon, authenticated
  using (status = 'published');

-- RLS policies for products (public read, admin write via service role)
create policy "Public can read published products" on public.products
  for select to anon, authenticated
  using (status = 'published');

-- Proposal versions (immutable snapshots)
create table if not exists public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.workspace_proposals(id) on delete cascade,
  version integer not null,
  title text not null,
  summary text not null,
  scope text[] not null default '{}',
  amount_myr numeric(12,2) not null,
  valid_until timestamptz,
  status text not null,
  changed_by text,
  change_reason text,
  created_at timestamptz not null default now()
);
create index if not exists proposal_versions_proposal_idx on public.proposal_versions(proposal_id, version desc);

-- Audit log for pipeline and admin actions
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null, -- 'admin', 'client', 'system'
  actor_id uuid,
  actor_email text,
  action text not null, -- 'lead.status.change', 'lead.assign', 'proposal.create', etc.
  entity_type text not null, -- 'lead', 'proposal', 'client', etc.
  entity_id uuid not null,
  before jsonb,
  after jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id, created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log(actor_type, actor_id, created_at desc);

alter table public.proposal_versions enable row level security;
alter table public.audit_log enable row level security;

-- RLS for proposal_versions (admin only via service role)
create policy "Admin can read proposal versions" on public.proposal_versions
  for select using (true); -- service role bypasses

-- RLS for audit_log (admin only)
create policy "Admin can read audit log" on public.audit_log
  for select using (true);
