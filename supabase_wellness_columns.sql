-- Bienestar pre-sesión + tipo de actividad reportados por el paciente en el portal.
-- Estos datos ya se capturan en la UI del portal, pero la API los descartaba y
-- nunca se guardaban. Se agregan de forma idempotente (IF NOT EXISTS) por si en
-- producción ya se habían creado manualmente.

ALTER TABLE load_sessions ADD COLUMN IF NOT EXISTS sleep_quality integer CHECK (sleep_quality >= 0 AND sleep_quality <= 10);
ALTER TABLE load_sessions ADD COLUMN IF NOT EXISTS energy integer CHECK (energy >= 0 AND energy <= 10);
ALTER TABLE load_sessions ADD COLUMN IF NOT EXISTS stress integer CHECK (stress >= 0 AND stress <= 10);
ALTER TABLE load_sessions ADD COLUMN IF NOT EXISTS activity_type text;
