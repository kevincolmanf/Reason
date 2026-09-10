-- ============================================================================
-- Modo Kinesiología — Fase 2: bitácora de "Atención de hoy" (continuidad)
-- ============================================================================
-- Cada vez que un profesional atiende a un paciente en modo kine, deja una
-- "atención": el síntoma del día, si fue día de manejo de síntomas, qué
-- modalidades usó y una nota opcional. De ahí se arma la línea de CONTINUIDAD
-- que lee el próximo profesional. La continuidad se genera casi sola (síntoma +
-- lo que se hizo); el texto libre es opcional.
--
-- Aditiva: tabla nueva, no toca nada existente. Solo se usa para pacientes con
-- kine_mode = true; los alumnos/entrenamiento nunca escriben acá.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/modo-kinesiologia.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kine_attentions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,   -- profesional que atendió
  professional_name text,                                        -- denormalizado, sobrevive al borrado del usuario
  attended_on date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  symptom text,                        -- 'mejor' | 'igual' | 'peor' | null
  manage_symptoms boolean NOT NULL DEFAULT false,  -- día sin carga (terapia manual, educar)
  modalities text[] NOT NULL DEFAULT '{}',         -- extras: 'manual' | 'reeval' | 'cuest'
  auto_summary text,                   -- línea de continuidad generada (síntoma + qué se hizo)
  note text,                           -- "el por qué", opcional
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kine_attentions_patient_idx
  ON public.kine_attentions (patient_id, created_at DESC);

ALTER TABLE public.kine_attentions ENABLE ROW LEVEL SECURITY;

-- Acceso por paciente: dueño del registro o miembro de la organización del
-- paciente (mismo criterio que patient_events / scheduled_sessions).
DROP POLICY IF EXISTS "Manage attentions of accessible patients" ON public.kine_attentions;
CREATE POLICY "Manage attentions of accessible patients" ON public.kine_attentions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = kine_attentions.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = kine_attentions.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  );
