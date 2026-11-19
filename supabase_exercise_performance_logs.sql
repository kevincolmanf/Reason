-- Progresión por ejercicio: registro del profesional de series/reps/peso
-- realmente usados por el paciente en cada sesión (no el objetivo del plan,
-- eso sigue en scheduled_sessions.session_data — esto es el historial de lo
-- que efectivamente se hizo, para poder graficar progresión de peso).
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/progresion-ejercicio.

CREATE TABLE IF NOT EXISTS public.exercise_performance_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES public.exercise_plans(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.scheduled_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id text NOT NULL,
  exercise_name text NOT NULL,
  scheduled_date date NOT NULL,
  sets integer,
  reps integer,
  weight numeric,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (session_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS exercise_performance_logs_patient_exercise_idx
  ON public.exercise_performance_logs (patient_id, exercise_id, scheduled_date);

ALTER TABLE public.exercise_performance_logs ENABLE ROW LEVEL SECURITY;

-- Acceso org-aware: dueño del paciente o miembro de su organización (mismo
-- patrón que simple_activity_log).
DROP POLICY IF EXISTS "Manage performance logs of accessible patients" ON public.exercise_performance_logs;
CREATE POLICY "Manage performance logs of accessible patients" ON public.exercise_performance_logs
  FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = exercise_performance_logs.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = exercise_performance_logs.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  );
