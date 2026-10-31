-- DutaOS sessions (v1).
--
-- One row per active auth session. company_id references public.companies,
-- the DutaOS account root -- there is no separate users table in v1.
--
-- Only SHA-256(token) is stored: the cookie carries the token itself, so a
-- datastore leak never hands out a live session.
--
-- The server writes with the service role, which bypasses RLS, so there are
-- deliberately no policies: anon and authenticated can neither read nor write.

create table if not exists public.dutaos_sessions (
  token_hash text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.dutaos_sessions enable row level security;

create index if not exists dutaos_sessions_company_idx on public.dutaos_sessions(company_id);
create index if not exists dutaos_sessions_expiry_idx on public.dutaos_sessions(expires_at);
