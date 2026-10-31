-- Add password_hash to companies for DutaOS auth (v1).
--
-- Auth signs companies up with email + password; the hash lives on the
-- companies row so login can look up a company by email and verify.

alter table public.companies add column if not exists password_hash text;
