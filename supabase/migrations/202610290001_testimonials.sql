-- Testimonial capture (handler.mjs /api/testimonial).
--
-- The endpoint validated its payload and then returned 501 because nothing
-- backed it. This is the storage it was missing: one row per submitted
-- testimonial, from the offboarding and monthly-review asks.
--
-- There are deliberately no policies on this table. RLS is enabled, which with
-- zero policies means anon and authenticated can read and write nothing, and
-- that is correct: the only writer is the server, which talks to PostgREST with
-- the service role and bypasses RLS without needing a policy. A `to anon`
-- insert policy would hand the public anon key the ability to write arbitrary
-- testimonials, and 202610280001 had to drop exactly this kind of over-broad
-- policy from audit_log and proposal_versions.

create table if not exists public.testimonials (
  id uuid primary key,
  client text not null,
  tier text,
  quote text not null,
  author text not null,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

create index if not exists testimonials_client_idx on public.testimonials(lower(client));
