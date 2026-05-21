-- Add agenda_slot_interval to users and organizations
-- Run in Supabase SQL editor

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agenda_slot_interval integer DEFAULT 60;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS agenda_slot_interval integer DEFAULT 60;
