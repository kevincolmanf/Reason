-- Migration: scheduled_sessions
-- Run this in Supabase Studio > SQL Editor

CREATE TABLE IF NOT EXISTS scheduled_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  patient_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  session_name TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user owns scheduled_sessions"
  ON scheduled_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
