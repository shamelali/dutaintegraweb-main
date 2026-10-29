-- Health-probe table plus a correction to two over-broad RLS policies.
--
-- 1. /api/health proves the datastore by writing, reading back and deleting a
--    sentinel row. It must not touch leads/clients, so it gets its own table.
--
-- 2. 202610270001_core_tables.sql created "Admin can read proposal versions"
--    and "Admin can read audit log" as `using (true)` with no `to` clause. A
--    policy without `to` applies to role `public`, which anon and authenticated
--    both inherit — so those two policies granted a leaked anon key read
--    access to every commercial proposal revision and to audit_log, which
--    holds customer emails and before/after snapshots of lead records. The
--    server talks to PostgREST with the service role, which bypasses RLS
--    entirely and needs no policy at all, so dropping them costs nothing.

create table if not exists public.health_probe (
  id uuid primary key,
  note text,
  created_at timestamptz not null default now()
);

alter table public.health_probe enable row level security;

drop policy if exists "Admin can read proposal versions" on public.proposal_versions;
drop policy if exists "Admin can read audit log" on public.audit_log;
