-- Migration: add week column to scheduled_sessions
-- Run this in Supabase Studio > SQL Editor

ALTER TABLE scheduled_sessions
  ADD COLUMN IF NOT EXISTS week INTEGER NOT NULL DEFAULT 1;
