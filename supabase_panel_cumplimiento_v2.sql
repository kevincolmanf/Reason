-- Estándares de calidad — panel unificado por N áreas (R2)
--
-- Reemplaza panel_cumplimiento_kinesiologia/_entrenamiento (2 funciones fijas)
-- por una sola panel_cumplimiento(), que agrupa por (profesional, área) donde
-- el área es la que cada centro configuró — no un binario kine/no-kine.
--
-- Área efectiva de un paciente: patients.area si está seteada; si no,
-- se cae al viejo binario kine_mode (Kinesiología/Entrenamiento) — así un
-- centro que nunca toca patients.area sigue viendo exactamente lo mismo que
-- antes, sin migrar nada.
--
-- Atribución: "quién hizo el evento" (user_id del registro — elegido por el
-- selector de profesional en la UI, o quien está logueado si no hay selector
-- — ver R4/R5), NO "de quién es el paciente". Única excepción: "pacientes
-- abiertos" (4) no es un evento con autor, así que se atribuye al profesional
-- asignado (habitual_professional_id o el que más lo atendió históricamente).
--
-- p_areas_config: el jsonb `config.areas` de organization_feature_settings,
-- tal cual — ej. {"Kinesiología": {"dias_paciente_abierto": 21, ...}, ...}.
-- Un área ausente de este objeto simplemente no calcula los indicadores
-- opt-in (cuestionario/plan/evaluación) — "paciente abierto" es la única
-- excepción universal, con default 21 si el área no está configurada.
--
-- NOTA: toda referencia a professional_id Y area dentro del cuerpo va
-- calificada con el alias de su CTE — ambas son columnas de RETURNS TABLE, y
-- plpgsql las trata como variables en todo el cuerpo (ver fix de 42702 en
-- supabase_panel_cumplimiento.sql).
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- fix/estandares-calidad-n-areas.

DROP FUNCTION IF EXISTS public.panel_cumplimiento_kinesiologia(uuid, timestamptz, timestamptz, int, int);
DROP FUNCTION IF EXISTS public.panel_cumplimiento_entrenamiento(uuid, timestamptz, timestamptz, int, text[]);

CREATE OR REPLACE FUNCTION public.panel_cumplimiento(
  p_org_id      uuid,
  p_from        timestamptz,
  p_to          timestamptz,
  p_areas_config jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  professional_id         uuid,
  area                    text,
  sesiones_total          int,
  sesiones_completas      int,
  pacientes_nuevos        int,
  nuevos_sin_cuestionario int,
  altas                   int,
  derivaciones            int,
  pausas                  int,
  abandonos               int,
  desconocido             int,
  pacientes_abiertos      int,
  nuevos_sin_plan         int,
  evaluaciones_incompletas int,
  pases_sin_informe       int
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
BEGIN
  IF NOT (public.is_org_owner(p_org_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH org_patients AS (
    SELECT p.id, p.admission_date, p.discharged_at, p.discharge_reason,
      COALESCE(p.area, CASE WHEN p.kine_mode THEN 'Kinesiología' ELSE 'Entrenamiento' END) AS area,
      COALESCE(p.habitual_professional_id, prof.professional_id) AS assigned_professional_id
    FROM public.patients p
    LEFT JOIN LATERAL (
      SELECT MODE() WITHIN GROUP (ORDER BY t.professional_id) AS professional_id
      FROM public.turnos t
      WHERE t.patient_id = p.id AND t.professional_id IS NOT NULL
    ) prof ON true
    WHERE p.org_id = p_org_id
  ),

  -- 1) Sesiones: día con estado (kine_attentions) y/o carga
  -- (exercise_performance_logs), atribuidas a quien cargó CADA evento.
  attention_days AS (
    SELECT op.id AS patient_id, op.area AS area, ka.attended_on AS session_date,
      -- attributed_professional_id (supabase_attribution.sql) resuelve quién
      -- atendió realmente — importante en tablets con login compartido, donde
      -- ka.user_id es siempre la misma cuenta.
      COALESCE(ka.attributed_professional_id, ka.user_id) AS professional_id,
      true AS has_state, (ka.created_at::date = ka.attended_on) AS state_same_day
    FROM public.kine_attentions ka
    JOIN org_patients op ON op.id = ka.patient_id
    WHERE ka.attended_on >= p_from::date AND ka.attended_on < p_to::date
  ),
  load_days AS (
    SELECT op.id AS patient_id, op.area AS area, epl.scheduled_date AS session_date,
      epl.user_id AS professional_id,
      true AS has_load, (epl.created_at::date = epl.scheduled_date) AS load_same_day
    FROM public.exercise_performance_logs epl
    JOIN org_patients op ON op.id = epl.patient_id
    WHERE epl.scheduled_date >= p_from::date AND epl.scheduled_date < p_to::date
  ),
  sessions AS (
    SELECT
      COALESCE(a.patient_id, l.patient_id) AS patient_id,
      COALESCE(a.area, l.area) AS area,
      COALESCE(a.professional_id, l.professional_id) AS professional_id,
      (COALESCE(a.has_state,false) AND COALESCE(a.state_same_day,false)
        AND COALESCE(l.has_load,false) AND COALESCE(l.load_same_day,false)) AS completa
    FROM attention_days a
    FULL OUTER JOIN load_days l ON a.patient_id = l.patient_id AND a.session_date = l.session_date
  ),
  ses_agg AS (
    SELECT ss.professional_id AS professional_id, ss.area AS area,
      COUNT(*)::int AS sesiones_total,
      COUNT(*) FILTER (WHERE ss.completa)::int AS sesiones_completas
    FROM sessions ss
    WHERE ss.professional_id IS NOT NULL
    GROUP BY ss.professional_id, ss.area
  ),

  -- 2/6) Nuevos del período, por área — "sin cuestionario"/"sin plan" solo si
  -- esa área tiene el umbral correspondiente configurado.
  nuevos AS (
    SELECT op.id AS id, op.area AS area, op.admission_date AS admission_date,
      op.assigned_professional_id AS professional_id
    FROM org_patients op
    WHERE op.discharged_at IS NULL
      AND op.admission_date >= p_from::date AND op.admission_date < p_to::date
  ),
  nuevos_agg AS (
    SELECT n.professional_id AS professional_id, n.area AS area,
      COUNT(*)::int AS pacientes_nuevos,
      COUNT(*) FILTER (
        WHERE (p_areas_config->n.area->>'dias_max_cuestionario_ingreso') IS NOT NULL
          AND p_to::date - n.admission_date >= (p_areas_config->n.area->>'dias_max_cuestionario_ingreso')::int
          AND NOT EXISTS (SELECT 1 FROM public.questionnaire_results qr WHERE qr.patient_id = n.id)
      )::int AS nuevos_sin_cuestionario,
      COUNT(*) FILTER (
        WHERE (p_areas_config->n.area->>'dias_max_plan') IS NOT NULL
          AND p_to::date - n.admission_date >= (p_areas_config->n.area->>'dias_max_plan')::int
          AND NOT EXISTS (SELECT 1 FROM public.exercise_plans ep WHERE ep.patient_id = n.id)
      )::int AS nuevos_sin_plan
    FROM nuevos n
    GROUP BY n.professional_id, n.area
  ),

  -- 3) Altas del período por motivo, atribuidas a quien hizo el alta (el
  -- hito que patientDischarge() deja en patient_events ese mismo día); si por
  -- lo que sea no hay hito, cae al profesional asignado del paciente.
  altas_periodo AS (
    SELECT op.area AS area, op.discharge_reason AS discharge_reason,
      COALESCE(pe.user_id, op.assigned_professional_id) AS professional_id
    FROM org_patients op
    LEFT JOIN LATERAL (
      SELECT pev.user_id
      FROM public.patient_events pev
      WHERE pev.patient_id = op.id AND pev.event_date = op.discharged_at::date
      ORDER BY pev.created_at DESC LIMIT 1
    ) pe ON true
    WHERE op.discharged_at >= p_from AND op.discharged_at < p_to
  ),
  altas_agg AS (
    SELECT ap.professional_id AS professional_id, ap.area AS area,
      COUNT(*) FILTER (WHERE ap.discharge_reason = 'alta')::int AS altas,
      COUNT(*) FILTER (WHERE ap.discharge_reason = 'derivacion')::int AS derivaciones,
      COUNT(*) FILTER (WHERE ap.discharge_reason = 'pausa_acordada')::int AS pausas,
      COUNT(*) FILTER (WHERE ap.discharge_reason = 'abandono')::int AS abandonos,
      COUNT(*) FILTER (WHERE ap.discharge_reason IS NULL
        OR ap.discharge_reason NOT IN ('alta','derivacion','pausa_acordada','abandono'))::int AS desconocido
    FROM altas_periodo ap
    WHERE ap.professional_id IS NOT NULL
    GROUP BY ap.professional_id, ap.area
  ),

  -- 4) Pacientes abiertos: estado sin autor — se atribuye al profesional
  -- asignado. Universal: default 21 días si el área no tiene el umbral propio.
  visitas AS (
    SELECT t.patient_id AS patient_id,
      MAX(t.start_time) FILTER (WHERE t.start_time < p_to) AS last_visit,
      COUNT(*) FILTER (WHERE t.start_time >= p_to) AS futuros
    FROM public.turnos t
    JOIN org_patients op ON op.id = t.patient_id
    WHERE t.is_blocked IS NOT TRUE AND t.status NOT IN ('cancelado','ausente')
    GROUP BY t.patient_id
  ),
  abiertos_agg AS (
    SELECT op.assigned_professional_id AS professional_id, op.area AS area,
      COUNT(*)::int AS pacientes_abiertos
    FROM org_patients op
    JOIN visitas v ON v.patient_id = op.id
    WHERE op.discharged_at IS NULL
      AND v.futuros = 0
      AND v.last_visit <= p_to - make_interval(days =>
            COALESCE((p_areas_config->op.area->>'dias_paciente_abierto')::int, 21))
    GROUP BY op.assigned_professional_id, op.area
  ),

  -- 5/8) Pases sin informe del período, atribuidos a quien hizo el pase.
  pases_agg AS (
    SELECT pat.transferred_by AS professional_id, op.area AS area,
      COUNT(*)::int AS pases_sin_informe
    FROM public.patient_area_transfers pat
    JOIN org_patients op ON op.id = pat.patient_id
    WHERE pat.transferred_at >= p_from AND pat.transferred_at < p_to
      AND (pat.report_note IS NULL OR btrim(pat.report_note) = '')
    GROUP BY pat.transferred_by, op.area
  ),

  -- 7) Evaluación de ingreso incompleta: activos, solo si el área tiene
  -- campos configurados, chequeando cada uno contra training_intake_evaluations.
  incompletas_agg AS (
    SELECT op.assigned_professional_id AS professional_id, op.area AS area,
      COUNT(*)::int AS evaluaciones_incompletas
    FROM org_patients op
    LEFT JOIN public.training_intake_evaluations tie
      ON tie.patient_id = op.id AND tie.area = op.area
    WHERE op.discharged_at IS NULL
      AND jsonb_array_length(COALESCE(p_areas_config->op.area->'campos_evaluacion_ingreso', '[]'::jsonb)) > 0
      AND (
        tie.id IS NULL
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(p_areas_config->op.area->'campos_evaluacion_ingreso') AS fld
          WHERE tie.data->>(fld->>'key') IS NULL OR tie.data->>(fld->>'key') = ''
        )
      )
    GROUP BY op.assigned_professional_id, op.area
  ),

  ids AS (
    SELECT sa.professional_id AS professional_id, sa.area AS area FROM ses_agg sa
    UNION SELECT na.professional_id, na.area FROM nuevos_agg na
    UNION SELECT aa.professional_id, aa.area FROM altas_agg aa
    UNION SELECT ab.professional_id, ab.area FROM abiertos_agg ab
    UNION SELECT pg.professional_id, pg.area FROM pases_agg pg
    UNION SELECT inc.professional_id, inc.area FROM incompletas_agg inc
  )
  SELECT
    i.professional_id, i.area,
    COALESCE(s.sesiones_total, 0), COALESCE(s.sesiones_completas, 0),
    COALESCE(n.pacientes_nuevos, 0), COALESCE(n.nuevos_sin_cuestionario, 0),
    COALESCE(al.altas, 0), COALESCE(al.derivaciones, 0), COALESCE(al.pausas, 0),
    COALESCE(al.abandonos, 0), COALESCE(al.desconocido, 0),
    COALESCE(ab.pacientes_abiertos, 0),
    COALESCE(n.nuevos_sin_plan, 0),
    COALESCE(inc.evaluaciones_incompletas, 0),
    COALESCE(pg.pases_sin_informe, 0)
  FROM ids i
  LEFT JOIN ses_agg s ON s.professional_id = i.professional_id AND s.area = i.area
  LEFT JOIN nuevos_agg n ON n.professional_id = i.professional_id AND n.area = i.area
  LEFT JOIN altas_agg al ON al.professional_id = i.professional_id AND al.area = i.area
  LEFT JOIN abiertos_agg ab ON ab.professional_id = i.professional_id AND ab.area = i.area
  LEFT JOIN pases_agg pg ON pg.professional_id = i.professional_id AND pg.area = i.area
  LEFT JOIN incompletas_agg inc ON inc.professional_id = i.professional_id AND inc.area = i.area
  WHERE i.professional_id IS NOT NULL;
END;
$$;
