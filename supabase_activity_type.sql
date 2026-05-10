-- Agrega tipo de actividad a sesiones de carga
ALTER TABLE load_sessions ADD COLUMN IF NOT EXISTS activity_type text;
-- Valores posibles: 'rehab' | 'sport' | 'combined'
