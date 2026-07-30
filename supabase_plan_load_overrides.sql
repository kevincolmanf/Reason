-- Carga real del paciente (override de la "carga sugerida" del kinesiólogo).
--
-- En el portal, cada ejercicio muestra la carga sugerida (la que puso el kine) en
-- gris. Si el paciente la modifica, se guarda acá como carga real de ESE ejercicio
-- en ESA sesión. Si no la toca, no hay fila y queda la sugerida.
--
-- Escrituras: llegan del portal vía admin client (validado por share_token del plan).
-- Lecturas del kine: RLS org-aware (dueño del paciente o miembro de su organización).
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/carga-sugerida-portal.

CREATE TABLE IF NOT EXISTS public.plan_load_overrides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid REFERENCES public.exercise_plans(id) ON DELETE CASCADE NOT NULL,
  session_id text NOT NULL,        -- id de la sesión (scheduled_sessions.id o template)
  exercise_id text NOT NULL,       -- exercise_id del ejercicio dentro del bloque
  scheduled_date date,             -- fecha de la sesión (informativa)
  actual_load text NOT NULL,       -- carga que efectivamente usó el paciente
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (plan_id, session_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS plan_load_overrides_plan_idx
  ON public.plan_load_overrides (plan_id);

ALTER TABLE public.plan_load_overrides ENABLE ROW LEVEL SECURITY;

-- El kine (dueño del paciente o miembro de su org) puede leer las cargas reales.
-- Las escrituras del paciente van por el admin client (service role, sin RLS).
DROP POLICY IF EXISTS "Read load overrides of accessible plans" ON public.plan_load_overrides;
CREATE POLICY "Read load overrides of accessible plans" ON public.plan_load_overrides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exercise_plans ep
      JOIN public.patients p ON p.id = ep.patient_id
      WHERE ep.id = plan_load_overrides.plan_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  );
