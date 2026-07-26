-- Evaluaciones programadas: permite dejar agendada una evaluación (RTS,
-- dinamometría o cuestionario) para un día futuro sin completarla en el momento.
--
-- Aparece como marcador en el calendario del plan y en el recordatorio de hitos
-- de la semana. Cuando llega el día, un botón "Completar" abre la herramienta
-- correspondiente ya con el protocolo y la fecha; al completarla, el marcador
-- programado se elimina.
--
-- RLS org-aware: dueño o cualquier miembro de la organización del paciente
-- (mismo criterio que patient_events y las evaluaciones).
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/programar-evaluaciones.

CREATE TABLE IF NOT EXISTS public.scheduled_evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL,            -- 'rts' | 'dyn' | 'quest'
  protocol_type text,           -- protocolo de RTS (lca, hamstring…); null para dinamo/cuestionario
  scheduled_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS scheduled_evaluations_patient_idx
  ON public.scheduled_evaluations (patient_id, scheduled_date);

ALTER TABLE public.scheduled_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manage scheduled evals of accessible patients" ON public.scheduled_evaluations;
CREATE POLICY "Manage scheduled evals of accessible patients" ON public.scheduled_evaluations
  FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = scheduled_evaluations.patient_id
        AND p.org_id IS NOT NULL AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = scheduled_evaluations.patient_id
        AND p.org_id IS NOT NULL AND public.is_org_member(p.org_id)
    )
  );
