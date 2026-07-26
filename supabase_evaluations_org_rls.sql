-- Evaluaciones visibles/gestionables por todo el equipo (organización).
--
-- Hasta ahora RTS, dinamometría y cuestionarios eran privados de quien los
-- cargaba (RLS por user_id). Se amplía para que cualquier miembro de la
-- organización del paciente pueda verlos y gestionarlos, igual que los hitos
-- (patient_events) y las sesiones (scheduled_sessions / load_sessions).
--
-- Se conserva el acceso del dueño (auth.uid() = user_id) como fallback, para
-- no dejar inaccesibles filas sin paciente asociado (p. ej. dinamometrías con
-- patient_id NULL) ni las de pacientes personales (sin organización).
--
-- Ejecutar en Supabase SQL Editor ANTES de que el equipo lo use en producción.

-- ─── RTS ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage their own RTS evaluations" ON public.rts_evaluations;
DROP POLICY IF EXISTS "Manage RTS of accessible patients" ON public.rts_evaluations;
CREATE POLICY "Manage RTS of accessible patients" ON public.rts_evaluations
  FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = rts_evaluations.patient_id
        AND p.org_id IS NOT NULL AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = rts_evaluations.patient_id
        AND p.org_id IS NOT NULL AND public.is_org_member(p.org_id)
    )
  );

-- ─── Dinamometría ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage their own dynamometer results" ON public.dynamometer_results;
DROP POLICY IF EXISTS "Manage dynamometer of accessible patients" ON public.dynamometer_results;
CREATE POLICY "Manage dynamometer of accessible patients" ON public.dynamometer_results
  FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = dynamometer_results.patient_id
        AND p.org_id IS NOT NULL AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = dynamometer_results.patient_id
        AND p.org_id IS NOT NULL AND public.is_org_member(p.org_id)
    )
  );

-- ─── Cuestionarios ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage their own questionnaire results" ON public.questionnaire_results;
DROP POLICY IF EXISTS "Manage questionnaires of accessible patients" ON public.questionnaire_results;
CREATE POLICY "Manage questionnaires of accessible patients" ON public.questionnaire_results
  FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = questionnaire_results.patient_id
        AND p.org_id IS NOT NULL AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = questionnaire_results.patient_id
        AND p.org_id IS NOT NULL AND public.is_org_member(p.org_id)
    )
  );
