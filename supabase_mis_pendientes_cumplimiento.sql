-- Estándares de calidad — Vista B: pendientes propios del profesional (M5)
--
-- A diferencia de panel_cumplimiento_* (M4, solo dueño/admin — es información
-- de GESTIÓN agregada de todo el equipo), esta función la puede llamar
-- CUALQUIER integrante del centro: is_org_member, no is_org_owner. La
-- seguridad real está en que SIEMPRE filtra por auth.uid() internamente — no
-- recibe un professional_id como parámetro, así que no hay forma de pedir los
-- pendientes de otro profesional.
--
-- Devuelve ITEMS concretos (no conteos): "kind" + paciente + "hace cuántos
-- días", para que el profesional pueda tocar y corregir cada uno, no solo ver
-- un número. El dashboard arma el texto ("3 sesiones sin registro", etc.)
-- agrupando por kind.
--
-- NOTA: igual que en M4, toda referencia a patient_id/patient_name dentro del
-- cuerpo va calificada con el alias de su CTE — son también columnas de
-- RETURNS TABLE, y plpgsql las trata como variables en todo el cuerpo.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- feature/estandares-calidad-m1-feature-settings.

CREATE OR REPLACE FUNCTION public.mis_pendientes_cumplimiento(
  p_org_id              uuid,
  p_to                  timestamptz DEFAULT now(),
  p_dias_cuestionario   int DEFAULT 7,
  p_dias_abierto        int DEFAULT 21,
  p_dias_plan           int DEFAULT 10,
  p_campos_obligatorios text[] DEFAULT '{}'
)
RETURNS TABLE (
  kind         text,  -- 'sesion_sin_registro' | 'cuestionario_pendiente' | 'paciente_abierto'
                       -- | 'alumno_sin_plan' | 'evaluacion_incompleta' | 'pase_sin_informe'
  patient_id   uuid,
  patient_name text,
  dias         int    -- "hace N días" cuando aplica (NULL si no corresponde)
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH my_kine AS (
    SELECT p.id, p.name, p.admission_date, p.discharged_at
    FROM public.patients p
    LEFT JOIN LATERAL (
      SELECT MODE() WITHIN GROUP (ORDER BY t.professional_id) AS professional_id
      FROM public.turnos t WHERE t.patient_id = p.id AND t.professional_id IS NOT NULL
    ) prof ON true
    WHERE p.org_id = p_org_id AND p.kine_mode = true
      AND COALESCE(p.habitual_professional_id, prof.professional_id) = auth.uid()
  ),
  my_training AS (
    SELECT p.id, p.name, p.admission_date, p.discharged_at
    FROM public.patients p
    LEFT JOIN LATERAL (
      SELECT MODE() WITHIN GROUP (ORDER BY t.professional_id) AS professional_id
      FROM public.turnos t WHERE t.patient_id = p.id AND t.professional_id IS NOT NULL
    ) prof ON true
    WHERE p.org_id = p_org_id AND p.kine_mode IS NOT TRUE
      AND COALESCE(p.habitual_professional_id, prof.professional_id) = auth.uid()
  ),

  -- 1) Sesiones de los últimos 7 días con algo registrado pero incompleto.
  recent_sessions AS (
    SELECT mk.id AS patient_id, mk.name AS patient_name, ka.attended_on AS session_date,
      true AS has_state, (ka.created_at::date = ka.attended_on) AS state_same_day,
      false AS has_load, false AS load_same_day
    FROM public.kine_attentions ka
    JOIN my_kine mk ON mk.id = ka.patient_id
    WHERE ka.attended_on >= (p_to::date - 7) AND ka.attended_on < p_to::date
    UNION ALL
    SELECT mk.id, mk.name, epl.scheduled_date,
      false, false,
      true, (epl.created_at::date = epl.scheduled_date)
    FROM public.exercise_performance_logs epl
    JOIN my_kine mk ON mk.id = epl.patient_id
    WHERE epl.scheduled_date >= (p_to::date - 7) AND epl.scheduled_date < p_to::date
  ),
  recent_sessions_merged AS (
    SELECT rs.patient_id, rs.patient_name, rs.session_date,
      bool_or(rs.has_state) AS has_state, bool_or(rs.has_state AND rs.state_same_day) AS state_same_day,
      bool_or(rs.has_load) AS has_load, bool_or(rs.has_load AND rs.load_same_day) AS load_same_day
    FROM recent_sessions rs
    GROUP BY rs.patient_id, rs.patient_name, rs.session_date
  ),
  sesiones_pendientes AS (
    SELECT 'sesion_sin_registro'::text AS kind, rsm.patient_id, rsm.patient_name,
      (p_to::date - rsm.session_date)::int AS dias
    FROM recent_sessions_merged rsm
    WHERE NOT (rsm.has_state AND rsm.state_same_day AND rsm.has_load AND rsm.load_same_day)
  ),

  -- 2) Cuestionario pendiente (nuevo, sin cuestionario, plazo vencido).
  cuestionario_pendiente AS (
    SELECT 'cuestionario_pendiente'::text AS kind, mk.id AS patient_id, mk.name AS patient_name,
      (p_to::date - mk.admission_date)::int AS dias
    FROM my_kine mk
    WHERE mk.discharged_at IS NULL
      AND p_to::date - mk.admission_date >= p_dias_cuestionario
      AND NOT EXISTS (SELECT 1 FROM public.questionnaire_results qr WHERE qr.patient_id = mk.id)
  ),

  -- 3) Paciente abierto (sin turno futuro, última visita vieja).
  paciente_abierto AS (
    SELECT 'paciente_abierto'::text AS kind, mk.id AS patient_id, mk.name AS patient_name,
      EXTRACT(DAY FROM p_to - v.last_visit)::int AS dias
    FROM my_kine mk
    JOIN LATERAL (
      SELECT MAX(t.start_time) FILTER (WHERE t.start_time < p_to) AS last_visit,
        COUNT(*) FILTER (WHERE t.start_time >= p_to) AS futuros
      FROM public.turnos t
      WHERE t.patient_id = mk.id AND t.is_blocked IS NOT TRUE AND t.status NOT IN ('cancelado','ausente')
    ) v ON true
    WHERE mk.discharged_at IS NULL
      AND v.futuros = 0
      AND v.last_visit <= p_to - make_interval(days => p_dias_abierto)
  ),

  -- 4) Alumno sin plan (nuevo, sin exercise_plans, plazo vencido).
  alumno_sin_plan AS (
    SELECT 'alumno_sin_plan'::text AS kind, mt.id AS patient_id, mt.name AS patient_name,
      (p_to::date - mt.admission_date)::int AS dias
    FROM my_training mt
    WHERE mt.discharged_at IS NULL
      AND p_to::date - mt.admission_date >= p_dias_plan
      AND NOT EXISTS (SELECT 1 FROM public.exercise_plans ep WHERE ep.patient_id = mt.id)
  ),

  -- 5) Evaluación de ingreso incompleta (activo, falta algún campo obligatorio).
  evaluacion_incompleta AS (
    SELECT 'evaluacion_incompleta'::text AS kind, mt.id AS patient_id, mt.name AS patient_name, NULL::int AS dias
    FROM my_training mt
    LEFT JOIN public.training_intake_evaluations tie ON tie.patient_id = mt.id
    WHERE mt.discharged_at IS NULL
      AND array_length(p_campos_obligatorios, 1) IS NOT NULL
      AND (
        tie.id IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(p_campos_obligatorios) AS rf(key)
          WHERE tie.data->>rf.key IS NULL OR tie.data->>rf.key = ''
        )
      )
  ),

  -- 6) Pases que YO registré, sin informe (cualquier área, kine o entrenamiento).
  pase_sin_informe AS (
    SELECT 'pase_sin_informe'::text AS kind, pat.patient_id, p.name AS patient_name,
      EXTRACT(DAY FROM p_to - pat.transferred_at)::int AS dias
    FROM public.patient_area_transfers pat
    JOIN public.patients p ON p.id = pat.patient_id
    WHERE p.org_id = p_org_id
      AND pat.transferred_by = auth.uid()
      AND (pat.report_note IS NULL OR btrim(pat.report_note) = '')
  )

  SELECT * FROM sesiones_pendientes
  UNION ALL SELECT * FROM cuestionario_pendiente
  UNION ALL SELECT * FROM paciente_abierto
  UNION ALL SELECT * FROM alumno_sin_plan
  UNION ALL SELECT * FROM evaluacion_incompleta
  UNION ALL SELECT * FROM pase_sin_informe;
END;
$$;
