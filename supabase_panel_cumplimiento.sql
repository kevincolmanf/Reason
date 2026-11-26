-- Estándares de calidad — funciones de agregación de los 8 indicadores (M4)
--
-- Mismo molde que panel_pro_* (supabase_panel_gestion_org_scope_fix.sql):
-- SECURITY INVOKER + chequeo explícito is_org_owner(p_org_id) OR is_admin()
-- (es información de GESTIÓN, no alcanza con lo que la RLS de base deja ver a
-- cualquier integrante). Los umbrales en días y los campos obligatorios de
-- evaluación de ingreso llegan como PARÁMETROS — igual que
-- get_lapsing_patients(p_threshold_days) — quien llama (la página server) lee
-- la config del centro en organization_feature_settings y la resuelve acá;
-- estas funciones no saben que ese mecanismo existe.
--
-- Atribución de "profesional del paciente": patients.habitual_professional_id
-- si está fijado, si no el que más lo atendió históricamente (MODE sobre
-- turnos.professional_id) — mismo criterio que panel_pro_retencion, mejorado
-- con el dato explícito cuando existe.
--
-- Todos los chequeos "¿está al día?" (sin cuestionario, sin plan, evaluación
-- incompleta, paciente abierto) se evalúan COMO ERA a la fecha p_to, no
-- "ahora" — así una vista de una semana pasada muestra lo que realmente
-- estaba pendiente esa semana, no el estado actual.
--
-- NOTA: todas las referencias a professional_id dentro del cuerpo van
-- calificadas con alias de tabla (ej. kp.professional_id), nunca "pelado" —
-- plpgsql trata el nombre de columna de RETURNS TABLE como una variable en
-- todo el cuerpo de la función, y una referencia sin calificar es ambigua
-- entre esa variable y la columna de la query (error 42702).
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- feature/estandares-calidad-m1-feature-settings.

-- ── KINESIOLOGÍA ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.panel_cumplimiento_kinesiologia(
  p_org_id            uuid,
  p_from              timestamptz,
  p_to                timestamptz,
  p_dias_cuestionario int DEFAULT 7,
  p_dias_abierto      int DEFAULT 21
)
RETURNS TABLE (
  professional_id         uuid,
  sesiones_total          int,  -- 1) días con algo registrado (estado o carga)
  sesiones_completas      int,  --    de esos, con AMBOS cargados el mismo día
  pacientes_nuevos        int,  -- 2) ingresaron en el período
  nuevos_sin_cuestionario int,  --    de esos, sin cuestionario y ya vencido el plazo
  altas                   int,  -- 3) altas del período por motivo
  derivaciones            int,
  pausas                  int,
  abandonos               int,
  desconocido             int,
  pacientes_abiertos      int,  -- 4) activos, sin turno futuro, última visita vieja
  pases_sin_informe       int   -- 5) pases a otra área sin informe, del período
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
BEGIN
  IF NOT (public.is_org_owner(p_org_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH kine_patients AS (
    SELECT p.id, p.admission_date, p.discharged_at, p.discharge_reason,
      COALESCE(p.habitual_professional_id, prof.professional_id) AS professional_id
    FROM public.patients p
    LEFT JOIN LATERAL (
      SELECT MODE() WITHIN GROUP (ORDER BY t.professional_id) AS professional_id
      FROM public.turnos t
      WHERE t.patient_id = p.id AND t.professional_id IS NOT NULL
    ) prof ON true
    WHERE p.org_id = p_org_id AND p.kine_mode = true
  ),
  attention_days AS (
    SELECT ka.patient_id, ka.attended_on AS session_date, ka.user_id AS professional_id,
      true AS has_state, (ka.created_at::date = ka.attended_on) AS state_same_day
    FROM public.kine_attentions ka
    JOIN kine_patients kp ON kp.id = ka.patient_id
    WHERE ka.attended_on >= p_from::date AND ka.attended_on < p_to::date
  ),
  load_days AS (
    SELECT epl.patient_id, epl.scheduled_date AS session_date, epl.user_id AS professional_id,
      true AS has_load, (epl.created_at::date = epl.scheduled_date) AS load_same_day
    FROM public.exercise_performance_logs epl
    JOIN kine_patients kp ON kp.id = epl.patient_id
    WHERE epl.scheduled_date >= p_from::date AND epl.scheduled_date < p_to::date
  ),
  sessions AS (
    SELECT
      COALESCE(a.patient_id, l.patient_id) AS patient_id,
      COALESCE(a.professional_id, l.professional_id) AS professional_id,
      (COALESCE(a.has_state, false) AND COALESCE(a.state_same_day, false)
        AND COALESCE(l.has_load, false) AND COALESCE(l.load_same_day, false)) AS completa
    FROM attention_days a
    FULL OUTER JOIN load_days l ON a.patient_id = l.patient_id AND a.session_date = l.session_date
  ),
  ses_agg AS (
    SELECT ss.professional_id, COUNT(*)::int AS sesiones_total,
      COUNT(*) FILTER (WHERE ss.completa)::int AS sesiones_completas
    FROM sessions ss WHERE ss.professional_id IS NOT NULL
    GROUP BY ss.professional_id
  ),
  nuevos AS (
    SELECT kp.id, kp.professional_id, kp.admission_date
    FROM kine_patients kp
    WHERE kp.discharged_at IS NULL
      AND kp.admission_date >= p_from::date AND kp.admission_date < p_to::date
  ),
  nuevos_agg AS (
    SELECT n.professional_id,
      COUNT(*)::int AS pacientes_nuevos,
      COUNT(*) FILTER (
        WHERE p_to::date - n.admission_date >= p_dias_cuestionario
          AND NOT EXISTS (SELECT 1 FROM public.questionnaire_results qr WHERE qr.patient_id = n.id)
      )::int AS nuevos_sin_cuestionario
    FROM nuevos n
    GROUP BY n.professional_id
  ),
  altas_periodo AS (
    SELECT kp.professional_id, kp.discharge_reason
    FROM kine_patients kp
    WHERE kp.discharged_at >= p_from AND kp.discharged_at < p_to
  ),
  altas_agg AS (
    SELECT ap.professional_id,
      COUNT(*) FILTER (WHERE ap.discharge_reason = 'alta')::int AS altas,
      COUNT(*) FILTER (WHERE ap.discharge_reason = 'derivacion')::int AS derivaciones,
      COUNT(*) FILTER (WHERE ap.discharge_reason = 'pausa_acordada')::int AS pausas,
      COUNT(*) FILTER (WHERE ap.discharge_reason = 'abandono')::int AS abandonos,
      COUNT(*) FILTER (WHERE ap.discharge_reason IS NULL
        OR ap.discharge_reason NOT IN ('alta','derivacion','pausa_acordada','abandono'))::int AS desconocido
    FROM altas_periodo ap
    GROUP BY ap.professional_id
  ),
  visitas AS (
    SELECT t.patient_id,
      MAX(t.start_time) FILTER (WHERE t.start_time < p_to) AS last_visit,
      COUNT(*) FILTER (WHERE t.start_time >= p_to) AS futuros
    FROM public.turnos t
    JOIN kine_patients kp ON kp.id = t.patient_id
    WHERE t.is_blocked IS NOT TRUE AND t.status NOT IN ('cancelado','ausente')
    GROUP BY t.patient_id
  ),
  abiertos_agg AS (
    SELECT kp.professional_id, COUNT(*)::int AS pacientes_abiertos
    FROM kine_patients kp
    JOIN visitas v ON v.patient_id = kp.id
    WHERE kp.discharged_at IS NULL
      AND v.futuros = 0
      AND v.last_visit <= p_to - make_interval(days => p_dias_abierto)
    GROUP BY kp.professional_id
  ),
  pases_agg AS (
    SELECT kp.professional_id, COUNT(*)::int AS pases_sin_informe
    FROM public.patient_area_transfers pat
    JOIN kine_patients kp ON kp.id = pat.patient_id
    WHERE pat.transferred_at >= p_from AND pat.transferred_at < p_to
      AND (pat.report_note IS NULL OR btrim(pat.report_note) = '')
    GROUP BY kp.professional_id
  ),
  ids AS (
    SELECT sa.professional_id FROM ses_agg sa
    UNION SELECT na.professional_id FROM nuevos_agg na
    UNION SELECT aa.professional_id FROM altas_agg aa
    UNION SELECT ab.professional_id FROM abiertos_agg ab
    UNION SELECT pg.professional_id FROM pases_agg pg
  )
  SELECT
    i.professional_id,
    COALESCE(s.sesiones_total, 0), COALESCE(s.sesiones_completas, 0),
    COALESCE(n.pacientes_nuevos, 0), COALESCE(n.nuevos_sin_cuestionario, 0),
    COALESCE(al.altas, 0), COALESCE(al.derivaciones, 0), COALESCE(al.pausas, 0),
    COALESCE(al.abandonos, 0), COALESCE(al.desconocido, 0),
    COALESCE(ab.pacientes_abiertos, 0),
    COALESCE(pg.pases_sin_informe, 0)
  FROM ids i
  LEFT JOIN ses_agg s ON s.professional_id = i.professional_id
  LEFT JOIN nuevos_agg n ON n.professional_id = i.professional_id
  LEFT JOIN altas_agg al ON al.professional_id = i.professional_id
  LEFT JOIN abiertos_agg ab ON ab.professional_id = i.professional_id
  LEFT JOIN pases_agg pg ON pg.professional_id = i.professional_id
  WHERE i.professional_id IS NOT NULL;
END;
$$;

-- ── ENTRENAMIENTO ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.panel_cumplimiento_entrenamiento(
  p_org_id              uuid,
  p_from                timestamptz,
  p_to                  timestamptz,
  p_dias_plan           int DEFAULT 10,
  p_campos_obligatorios text[] DEFAULT '{}'
)
RETURNS TABLE (
  professional_id          uuid,
  alumnos_nuevos           int,  -- 6) ingresaron en el período
  nuevos_sin_plan          int,  --    de esos, sin plan cargado y ya vencido el plazo
  evaluaciones_incompletas int,  -- 7) activos sin evaluación de ingreso completa
  pases_sin_informe        int   -- 8) pases a otra área sin informe, del período
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
BEGIN
  IF NOT (public.is_org_owner(p_org_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH training_patients AS (
    SELECT p.id, p.admission_date, p.discharged_at,
      COALESCE(p.habitual_professional_id, prof.professional_id) AS professional_id
    FROM public.patients p
    LEFT JOIN LATERAL (
      SELECT MODE() WITHIN GROUP (ORDER BY t.professional_id) AS professional_id
      FROM public.turnos t
      WHERE t.patient_id = p.id AND t.professional_id IS NOT NULL
    ) prof ON true
    WHERE p.org_id = p_org_id AND p.kine_mode IS NOT TRUE
  ),
  nuevos AS (
    SELECT tp.id, tp.professional_id, tp.admission_date
    FROM training_patients tp
    WHERE tp.discharged_at IS NULL
      AND tp.admission_date >= p_from::date AND tp.admission_date < p_to::date
  ),
  nuevos_agg AS (
    SELECT n.professional_id,
      COUNT(*)::int AS alumnos_nuevos,
      COUNT(*) FILTER (
        WHERE p_to::date - n.admission_date >= p_dias_plan
          AND NOT EXISTS (SELECT 1 FROM public.exercise_plans ep WHERE ep.patient_id = n.id)
      )::int AS nuevos_sin_plan
    FROM nuevos n
    GROUP BY n.professional_id
  ),
  -- No se limita a "nuevos": una evaluación de ingreso incompleta sigue siendo
  -- un hueco de cumplimiento mientras el alumno siga activo, sin importar
  -- cuándo ingresó. Sin campos obligatorios configurados (lista vacía), nadie
  -- cuenta como incompleto — el centro todavía no definió qué exigir.
  incompletas_agg AS (
    SELECT tp.professional_id, COUNT(*)::int AS evaluaciones_incompletas
    FROM training_patients tp
    LEFT JOIN public.training_intake_evaluations tie ON tie.patient_id = tp.id
    WHERE tp.discharged_at IS NULL
      AND array_length(p_campos_obligatorios, 1) IS NOT NULL
      AND (
        tie.id IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(p_campos_obligatorios) AS rf(key)
          WHERE tie.data->>rf.key IS NULL OR tie.data->>rf.key = ''
        )
      )
    GROUP BY tp.professional_id
  ),
  pases_agg AS (
    SELECT tp.professional_id, COUNT(*)::int AS pases_sin_informe
    FROM public.patient_area_transfers pat
    JOIN training_patients tp ON tp.id = pat.patient_id
    WHERE pat.transferred_at >= p_from AND pat.transferred_at < p_to
      AND (pat.report_note IS NULL OR btrim(pat.report_note) = '')
    GROUP BY tp.professional_id
  ),
  ids AS (
    SELECT na.professional_id FROM nuevos_agg na
    UNION SELECT inc.professional_id FROM incompletas_agg inc
    UNION SELECT pg.professional_id FROM pases_agg pg
  )
  SELECT
    i.professional_id,
    COALESCE(n.alumnos_nuevos, 0), COALESCE(n.nuevos_sin_plan, 0),
    COALESCE(inc.evaluaciones_incompletas, 0),
    COALESCE(pg.pases_sin_informe, 0)
  FROM ids i
  LEFT JOIN nuevos_agg n ON n.professional_id = i.professional_id
  LEFT JOIN incompletas_agg inc ON inc.professional_id = i.professional_id
  LEFT JOIN pases_agg pg ON pg.professional_id = i.professional_id
  WHERE i.professional_id IS NOT NULL;
END;
$$;
