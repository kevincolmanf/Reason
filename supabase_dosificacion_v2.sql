-- Migration: Dosificación V2
-- Sesiones por día con contenido independiente
-- No rompe nada existente: solo agrega columnas nuevas

-- 1. Agregar session_data a scheduled_sessions
-- session_data almacena { blocks: [ { id, name, exercises: [ { id, exercise_id, exercise_name, youtube_url, group, sets, reps, load, rpe_obj, eav_obj, rest } ] } ] }
ALTER TABLE scheduled_sessions
  ADD COLUMN IF NOT EXISTS session_data JSONB;

-- 2. Agregar scheduled_date a plan_activity_logs (para el nuevo flujo)
ALTER TABLE plan_activity_logs
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_session_id UUID REFERENCES scheduled_sessions(id) ON DELETE SET NULL;

-- 3. Índice para buscar sesiones por plan
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_plan_date
  ON scheduled_sessions (plan_id, scheduled_date);

-- 4. Índice para buscar logs por plan y fecha (monitoreo)
CREATE INDEX IF NOT EXISTS idx_activity_logs_plan_date
  ON plan_activity_logs (plan_id, scheduled_date);
