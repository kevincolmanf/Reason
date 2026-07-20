-- Duración de turno por área/agenda (ej: Traumatología 20', Kinesiología 60')
-- Mapa JSON { "nombre del área": minutos }. Las áreas que no estén en el mapa
-- usan el intervalo global (agenda_slot_interval), igual que "Todas las agendas".
-- Correr en el SQL editor de Supabase.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agenda_area_durations jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS agenda_area_durations jsonb NOT NULL DEFAULT '{}'::jsonb;
