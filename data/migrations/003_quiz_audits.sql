-- Phase C: Free IT Audit persistence
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- Project: dutaintegraweb-main

-- Quiz audit completions
CREATE TABLE IF NOT EXISTS quiz_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_size INTEGER NOT NULL CHECK (team_size BETWEEN 1 AND 3),
  it_spend NUMERIC NOT NULL CHECK (it_spend >= 0),
  pain_points TEXT[] DEFAULT '{}',
  tier TEXT NOT NULL CHECK (tier IN ('Foundation', 'Growth', 'AI Partner')),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_quiz_audits_created ON quiz_audits (created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_audits_tier ON quiz_audits (tier);

-- Row-level security (enable if using Supabase Auth)
-- ALTER TABLE quiz_audits ENABLE ROW LEVEL SECURITY;
