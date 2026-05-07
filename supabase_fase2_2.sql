-- Fase 2.2: Reporte del Paciente

CREATE TABLE IF NOT EXISTS plan_activity_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id uuid REFERENCES exercise_plans(id) ON DELETE CASCADE,
    share_token text NOT NULL,
    exercise_id uuid NOT NULL,
    exercise_name text NOT NULL,
    session_id text NOT NULL,
    week integer NOT NULL,
    rpe integer NOT NULL CHECK (rpe >= 1 AND rpe <= 10),
    eva integer NOT NULL CHECK (eva >= 0 AND eva <= 10),
    notes text,
    logged_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE plan_activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas
-- Inserción: Se manejará vía Service Role Key en la API Route, así que no hace falta política pública para INSERT
-- Lectura: Solo el dueño del plan puede leer los logs
CREATE POLICY "Users can view their own plan logs" ON plan_activity_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM exercise_plans 
    WHERE exercise_plans.id = plan_activity_logs.plan_id 
    AND exercise_plans.user_id = auth.uid()
  )
);
