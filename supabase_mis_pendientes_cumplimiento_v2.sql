-- Estándares de calidad — Vista B por N áreas (R2)
--
-- Reemplaza la versión anterior (kine_mode binario, parámetros planos) por
-- una generalizada a cualquier área, config por área (mismo p_areas_config
-- jsonb que panel_cumplimiento). Sigue siendo llamable por CUALQUIER
-- integrante (is_org_member, no is_org_owner) y sigue filtrando SIEMPRE por
-- auth.uid() — eso no cambia.
--
-- Atribución (mismo criterio que panel_cumplimiento v2): "sesión sin
-- registro" y "pase sin informe" son eventos con autor — se filtran por quién
-- cargó CADA evento (auth.uid()), no por "paciente asignado a mí". Los demás
-- (cuestionario/plan pendiente, paciente abierto, evaluación incompleta) son
-- estado del paciente sin autor — se filtran por "paciente asignado a mí"
-- (habitual_professional_id o el que más lo atendió históricamente).
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- fix/estandares-calidad-n-areas.

DROP FUNCTION IF EXISTS public.mis_pendientes_cumplimiento(uuid, timestamptz, int, int, int, text[]);

CREATE OR REPLACE FUNCTION public.mis_pendientes_cumplimiento(
  p_org_id       uuid,
  p_to           timestamptz DEFAULT now(),
  p_areas_config jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  kind         text,  -- 'sesion_sin_registro' | 'cuestionario_pendiente' | 'paciente_abierto'
                       -- | 'alumno_sin_plan' | 'evaluacion_incompleta' | 'pase_sin_informe'
  area         text,
  patient_id   uuid,
  patient_name text,
  dias         int
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH org_patients AS (
    SELECT p.id, p.name, p.admission_date, p.discharged_at,
      COALESCE(p.area, CASE WHEN p.kine_mode THEN 'Kinesiología' ELSE 'Entrenamiento' END) AS area,
      COALESCE(p.habitual_professional_id, prof.professional_id) AS assigned_professional_id
    FROM public.patients p
    LEFT JOIN LATERAL (
      SELECT MODE() WITHIN GROUP (ORDER BY t.professional_id) AS professional_id
      FROM public.turnos t WHERE t.patient_id = p.id AND t.professional_id IS NOT NULL
    ) prof ON true
    WHERE p.org_id = p_org_id
  ),
  my_patients AS (
    SELECT op.* FROM org_patients op WHERE op.assigned_professional_id = auth.uid()
  ),

  -- 1) Sesiones de los últimos 7 días que YO cargué (como evento), incompletas.
  recent_sessions AS (
    SELECT op.id AS patient_id, op.name AS patient_name, op.area AS area,
      ka.attended_on AS session_date,
      true AS has_state, (ka.created_at::date = ka.attended_on) AS state_same_day,
      false AS has_load, false AS load_same_day
    FROM public.kine_attentions ka
    JOIN org_patients op ON op.id = ka.patient_id
    -- attributed_professional_id (supabase_attribution.sql) resuelve quién
    -- atendió realmente — en tablets con login compartido, ka.user_id es
    -- siempre la misma cuenta y no identifica a la persona.
    WHERE COALESCE(ka.attributed_professional_id, ka.user_id) = auth.uid()
      AND ka.attended_on >= (p_to::date - 7) AND ka.attended_on < p_to::date
    UNION ALL
    SELECT op.id, op.name, op.area, epl.scheduled_date,
      false, false,
      true, (epl.created_at::date = epl.scheduled_date)
    FROM public.exercise_performance_logs epl
    JOIN org_patients op ON op.id = epl.patient_id
    WHERE epl.user_id = auth.uid()
      AND epl.scheduled_date >= (p_to::date - 7) AND epl.scheduled_date < p_to::date
  ),
  recent_sessions_merged AS (
    SELECT rs.patient_id AS patient_id, rs.patient_name AS patient_name, rs.area AS area,
      rs.session_date AS session_date,
      bool_or(rs.has_state) AS has_state, bool_or(rs.has_state AND rs.state_same_day) AS state_same_day,
      bool_or(rs.has_load) AS has_load, bool_or(rs.has_load AND rs.load_same_day) AS load_same_day
    FROM recent_sessions rs
    GROUP BY rs.patient_id, rs.patient_name, rs.area, rs.session_date
  ),
  sesiones_pendientes AS (
    SELECT 'sesion_sin_registro'::text AS kind, rsm.area AS area, rsm.patient_id AS patient_id,
      rsm.patient_name AS patient_name, (p_to::date - rsm.session_date)::int AS dias
    FROM recent_sessions_merged rsm
    WHERE NOT (rsm.has_state AND rsm.state_same_day AND rsm.has_load AND rsm.load_same_day)
  ),

  -- 2) Cuestionario pendiente — mis pacientes nuevos, solo en áreas con el umbral configurado.
  cuestionario_pendiente AS (
    SELECT 'cuestionario_pendiente'::text AS kind, mp.area AS area, mp.id AS patient_id, mp.name AS patient_name,
      (p_to::date - mp.admission_date)::int AS dias
    FROM my_patients mp
    WHERE mp.discharged_at IS NULL
      AND (p_areas_config->mp.area->>'dias_max_cuestionario_ingreso') IS NOT NULL
      AND p_to::date - mp.admission_date >= (p_areas_config->mp.area->>'dias_max_cuestionario_ingreso')::int
      AND NOT EXISTS (SELECT 1 FROM public.questionnaire_results qr WHERE qr.patient_id = mp.id)
  ),

  -- 3) Paciente abierto — universal, default 21 si el área no está configurada.
  paciente_abierto AS (
    SELECT 'paciente_abierto'::text AS kind, mp.area AS area, mp.id AS patient_id, mp.name AS patient_name,
      EXTRACT(DAY FROM p_to - v.last_visit)::int AS dias
    FROM my_patients mp
    JOIN LATERAL (
      SELECT MAX(t.start_time) FILTER (WHERE t.start_time < p_to) AS last_visit,
        COUNT(*) FILTER (WHERE t.start_time >= p_to) AS futuros
      FROM public.turnos t
      WHERE t.patient_id = mp.id AND t.is_blocked IS NOT TRUE AND t.status NOT IN ('cancelado','ausente')
    ) v ON true
    WHERE mp.discharged_at IS NULL
      AND v.futuros = 0
      AND v.last_visit <= p_to - make_interval(days =>
            COALESCE((p_areas_config->mp.area->>'dias_paciente_abierto')::int, 21))
  ),

  -- 4) Alumno sin plan — mis pacientes nuevos, solo en áreas con el umbral configurado.
  alumno_sin_plan AS (
    SELECT 'alumno_sin_plan'::text AS kind, mp.area AS area, mp.id AS patient_id, mp.name AS patient_name,
      (p_to::date - mp.admission_date)::int AS dias
    FROM my_patients mp
    WHERE mp.discharged_at IS NULL
      AND (p_areas_config->mp.area->>'dias_max_plan') IS NOT NULL
      AND p_to::date - mp.admission_date >= (p_areas_config->mp.area->>'dias_max_plan')::int
      AND NOT EXISTS (SELECT 1 FROM public.exercise_plans ep WHERE ep.patient_id = mp.id)
  ),

  -- 5) Evaluación de ingreso incompleta — mis pacientes activos, solo en áreas
  -- con campos configurados.
  evaluacion_incompleta AS (
    SELECT 'evaluacion_incompleta'::text AS kind, mp.area AS area, mp.id AS patient_id, mp.name AS patient_name,
      NULL::int AS dias
    FROM my_patients mp
    LEFT JOIN public.training_intake_evaluations tie ON tie.patient_id = mp.id AND tie.area = mp.area
    WHERE mp.discharged_at IS NULL
      AND jsonb_array_length(COALESCE(p_areas_config->mp.area->'campos_evaluacion_ingreso', '[]'::jsonb)) > 0
      AND (
        tie.id IS NULL
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(p_areas_config->mp.area->'campos_evaluacion_ingreso') AS fld
          WHERE tie.data->>(fld->>'key') IS NULL OR tie.data->>(fld->>'key') = ''
        )
      )
  ),

  -- 6) Pases que YO registré, sin informe.
  pase_sin_informe AS (
    SELECT 'pase_sin_informe'::text AS kind, op.area AS area, pat.patient_id AS patient_id, op.name AS patient_name,
      EXTRACT(DAY FROM p_to - pat.transferred_at)::int AS dias
    FROM public.patient_area_transfers pat
    JOIN org_patients op ON op.id = pat.patient_id
    WHERE pat.transferred_by = auth.uid()
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
