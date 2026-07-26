-- Modo de plan por paciente + bitácora de actividad simple.
--
-- Para pacientes agudos/mayores (que nunca verán el portal) el editor de planes
-- completo es engorroso. El modo 'simple' ofrece una bitácora: qué se hizo cada
-- día (ejercicios por nombre, sin dosificación) + una nota, visible para el equipo.
-- El default 'detallado' mantiene el editor de planes actual, intacto.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/modo-seguimiento-simple.

-- Modo de plan del paciente: 'detallado' (editor de planes) | 'simple' (bitácora)
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS plan_mode text NOT NULL DEFAULT 'detallado';

-- Bitácora de actividad (modo simple)
CREATE TABLE IF NOT EXISTS public.simple_activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_date date NOT NULL,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ id?: string, name: string }]
  note text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS simple_activity_log_patient_idx
  ON public.simple_activity_log (patient_id, activity_date DESC);

ALTER TABLE public.simple_activity_log ENABLE ROW LEVEL SECURITY;

-- Acceso org-aware: dueño del paciente o miembro de su organización (como los hitos).
DROP POLICY IF EXISTS "Manage simple activity of accessible patients" ON public.simple_activity_log;
CREATE POLICY "Manage simple activity of accessible patients" ON public.simple_activity_log
  FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = simple_activity_log.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = simple_activity_log.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  );
