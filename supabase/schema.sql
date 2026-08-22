-- ============================================================================
-- Duta Integra — Leads table for Supabase
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  company TEXT DEFAULT '',
  service TEXT DEFAULT '',
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  source TEXT DEFAULT 'contact-form',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);

-- Index for searching by name/email
CREATE INDEX IF NOT EXISTS idx_leads_search ON leads USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations from service role (admin API)
CREATE POLICY "Allow all for service role" ON leads
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Allow insert from anon (contact form submissions)
CREATE POLICY "Allow insert for anon" ON leads
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow select for authenticated users only (admin dashboard)
CREATE POLICY "Allow select for authenticated" ON leads
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insert demo data
INSERT INTO leads (name, email, phone, company, service, message, status, source) VALUES
  ('Dato'' Sri Hisham', 'hisham@lapango.com', '+60123456789', 'Lapango', 'AI Chatbot', 'Interested in AI chatbot for customer service', 'new', 'contact-form'),
  ('Puan Aminah', 'aminah@eastelpro.com', '+60198881122', 'Eastelpro', 'Managed IT', 'Need WiFi marketing portal setup', 'contacted', 'contact-form'),
  ('Mr. Marcus Tan', 'marcus@agmx.com', '+60165559900', 'AGMX', 'Cloud Migration', 'Looking to migrate to cloud infrastructure', 'closed', 'contact-form')
ON CONFLICT DO NOTHING;
