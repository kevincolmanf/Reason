-- ─────────────────────────────────────────────────────────────────
-- RLS fix: allow org members to read/write data for their org's patients
-- Run this in Supabase SQL editor
-- ─────────────────────────────────────────────────────────────────

-- Helper expression (used inline below):
-- EXISTS (SELECT 1 FROM patients p WHERE p.id = <table>.patient_id AND p.org_id IS NOT NULL AND public.is_org_member(p.org_id))


-- ── patient_fichas ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can access fichas of org patients" ON patient_fichas;
CREATE POLICY "Org members can access fichas of org patients" ON patient_fichas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_fichas.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_fichas.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  );

-- ── questionnaire_results ─────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can access questionnaire results of org patients" ON questionnaire_results;
CREATE POLICY "Org members can access questionnaire results of org patients" ON questionnaire_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = questionnaire_results.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = questionnaire_results.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  );

-- ── dynamometer_results ───────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can access dynamometer results of org patients" ON dynamometer_results;
CREATE POLICY "Org members can access dynamometer results of org patients" ON dynamometer_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = dynamometer_results.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = dynamometer_results.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  );

-- ── load_sessions ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can access load sessions of org patients" ON load_sessions;
CREATE POLICY "Org members can access load sessions of org patients" ON load_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = load_sessions.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = load_sessions.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  );

-- ── rts_evaluations ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can access RTS evaluations of org patients" ON rts_evaluations;
CREATE POLICY "Org members can access RTS evaluations of org patients" ON rts_evaluations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = rts_evaluations.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = rts_evaluations.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  );

-- ── scheduled_sessions ────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can access scheduled sessions of org patients" ON scheduled_sessions;
CREATE POLICY "Org members can access scheduled sessions of org patients" ON scheduled_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = scheduled_sessions.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = scheduled_sessions.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  );

-- ── exercise_plans (only when assigned to an org patient) ─────────
DROP POLICY IF EXISTS "Org members can access plans of org patients" ON exercise_plans;
CREATE POLICY "Org members can access plans of org patients" ON exercise_plans
  FOR ALL
  USING (
    patient_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = exercise_plans.patient_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    patient_id IS NOT NULL
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM patients p
        WHERE p.id = exercise_plans.patient_id
          AND p.org_id IS NOT NULL
          AND public.is_org_member(p.org_id)
      )
    )
  );

-- ── plan_activity_logs (via exercise_plans → patient) ────────────
DROP POLICY IF EXISTS "Org members can view plan logs of org patients" ON plan_activity_logs;
CREATE POLICY "Org members can view plan logs of org patients" ON plan_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exercise_plans ep
      JOIN patients p ON p.id = ep.patient_id
      WHERE ep.id = plan_activity_logs.plan_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  );
