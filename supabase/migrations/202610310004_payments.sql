-- DutaOS payments table.
--
-- payments: one row per checkout attempt. company_id links to the company
-- that initiated the payment. provider is "hitpay" or "billplz".
--
-- The server writes with the service role, which bypasses RLS and needs no
-- policy, so there are deliberately no policies here.

create table if not exists public.payments (
  id uuid primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  amount integer not null,
  currency text not null default 'MYR',
  status text not null default 'pending',
  provider_payment_id text,
  checkout_url text,
  plan text,
  metadata text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create index if not exists payments_company_idx on public.payments(company_id);
create index if not exists payments_status_idx on public.payments(status);
