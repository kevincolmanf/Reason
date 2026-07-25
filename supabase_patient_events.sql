-- Hitos / eventos del tratamiento en el calendario del paciente (Propuesta 2)
--
-- El calendario deja de ser solo entrenamientos: suma hitos como evaluación,
-- reevaluación, RTP, control, alta, objetivo, competencia y otros.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/eventos-calendario-paciente.

CREATE TABLE IF NOT EXISTS public.patient_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  event_date date NOT NULL,
  type text NOT NULL, -- evaluacion|reevaluacion|rtp|control|alta|objetivo|competencia|otro
  title text,
  note text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS patient_events_patient_idx ON public.patient_events (patient_id, event_date);

ALTER TABLE public.patient_events ENABLE ROW LEVEL SECURITY;

-- Acceso por paciente: dueño del registro o miembro de la organización del
-- paciente (mismo criterio que scheduled_sessions / load_sessions).
DROP POLICY IF EXISTS "Manage events of accessible patients" ON public.patient_events;
CREATE POLICY "Manage events of accessible patients" ON public.patient_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_events.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_events.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  );
