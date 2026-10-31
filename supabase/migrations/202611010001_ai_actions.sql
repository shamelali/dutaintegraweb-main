-- Audit trail for the DutaOS AI chatbar (harvested from the Duta CEO prototype).
--
-- Every assistant turn is recorded: the prompt, which model answered, and the
-- approval level it ran at. Level 0 is read-only. Levels 1-4 exist for write
-- tools that are not shipped yet, so the table is ready before the capability.
--
-- The server writes with the service role, which bypasses RLS, so there are
-- deliberately no policies: anon and authenticated can neither read nor write.

create table if not exists public.ai_actions (
  id uuid primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  action_type text not null default 'recommendation',
  approval_level integer not null default 0,
  tool_name text,
  input_data jsonb not null default '{}'::jsonb,
  output_data jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  constraint chk_ai_action_type check (action_type in ('recommendation','draft','auto_execute')),
  constraint chk_ai_action_level check (approval_level between 0 and 4),
  constraint chk_ai_action_status check (status in ('pending','approved','rejected','executed','failed'))
);

alter table public.ai_actions enable row level security;

create index if not exists ai_actions_company_created_idx on public.ai_actions(company_id, created_at desc);
