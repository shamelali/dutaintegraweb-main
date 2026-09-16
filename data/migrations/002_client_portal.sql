-- Phase B: Client Portal + Monthly Digest
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- Project: dutaintegraweb-main

-- Client accounts
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  company TEXT,
  tier TEXT DEFAULT 'foundation' CHECK (tier IN ('foundation', 'growth', 'ai_partner')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'churned')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client portal sessions
CREATE TABLE IF NOT EXISTS client_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly digest log
CREATE TABLE IF NOT EXISTS monthly_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  content_json JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_client_sessions_client_id ON client_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_token_hash ON client_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_monthly_digests_client_id ON monthly_digests(client_id);
CREATE INDEX IF NOT EXISTS idx_monthly_digests_month ON monthly_digests(month);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_digests ENABLE ROW LEVEL SECURITY;

-- RLS policies (service role bypasses RLS, these are for client-facing queries)
CREATE POLICY "Service role full access" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON client_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON monthly_digests FOR ALL USING (true) WITH CHECK (true);
