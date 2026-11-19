-- SEGURIDAD: las funciones del panel de gestión (panel_pro_operativo,
-- panel_pro_retencion, panel_pro_clinico) no filtraban por organización —
-- devolvían todo lo que la RLS del usuario que las llama le permite ver, sin
-- importar de qué organización. Un profesional miembro de MÁS DE UNA
-- organización (ej. trabajó en un centro y ahora tiene el propio) veía, en el
-- panel de gestión de su org nueva, métricas mezcladas con las de la otra
-- organización de la que sigue siendo miembro.
--
-- El código ya tiene un mitigante (src/app/account/crm/page.tsx solo muestra
-- profesionales que son organization_members de la org actual), pero esto
-- cierra el problema desde la base: las funciones ahora reciben p_org_id y
-- filtran explícitamente por organización, no solo por lo que la RLS deja ver.
--
-- Ejecutar en Supabase SQL Editor LO ANTES POSIBLE — es un fix de seguridad,
-- no requiere coordinar un merge de rama.

DROP FUNCTION IF EXISTS public.panel_pro_operativo(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.panel_pro_retencion();
DROP FUNCTION IF EXISTS public.panel_pro_clinico(timestamptz, timestamptz);

-- ── 1) Operativo del mes, por profesional (ahora filtrado por organización) ─
CREATE OR REPLACE FUNCTION public.panel_pro_operativo(p_org_id uuid, p_from timestamptz, p_to timestamptz)
RETURNS TABLE (
  professional_id   uuid,
  professional_name text,
  turnos            int,
  presentes         int,
  ausentes          int,
  cancelados        int,
  nuevos            int,
  horas             numeric,
  dias              int,
  pacientes         int
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT t.professional_id, t.professional_name, t.status, t.appointment_type,
           t.patient_id, t.start_time, t.end_time
    FROM public.turnos t
    WHERE t.org_id = p_org_id
      AND t.is_blocked IS NOT TRUE
      AND t.professional_id IS NOT NULL
      AND t.start_time >= p_from AND t.start_time < p_to
  ),
  perday AS (
    SELECT professional_id, start_time::date AS d,
      EXTRACT(EPOCH FROM (MAX(end_time) - MIN(start_time)))/3600.0 AS span_h
    FROM base
    WHERE status <> 'cancelado'
    GROUP BY professional_id, start_time::date
  ),
  jornada AS (
    SELECT professional_id,
      ROUND(SUM(span_h)::numeric, 1) AS horas,
      COUNT(*)::int AS dias
    FROM perday
    GROUP BY professional_id
  )
  SELECT
    b.professional_id,
    COALESCE(MAX(b.professional_name), '') AS professional_name,
    COUNT(*) FILTER (WHERE b.status <> 'cancelado')::int AS turnos,
    COUNT(*) FILTER (WHERE b.status = 'presente')::int   AS presentes,
    COUNT(*) FILTER (WHERE b.status = 'ausente')::int     AS ausentes,
    COUNT(*) FILTER (WHERE b.status = 'cancelado')::int   AS cancelados,
    COUNT(*) FILTER (WHERE b.status <> 'cancelado' AND b.appointment_type IN ('primera_vez','ingreso'))::int AS nuevos,
    COALESCE(j.horas, 0)::numeric AS horas,
    COALESCE(j.dias, 0)::int AS dias,
    COUNT(DISTINCT b.patient_id) FILTER (WHERE b.status <> 'cancelado')::int AS pacientes
  FROM base b
  LEFT JOIN jornada j ON j.professional_id = b.professional_id
  GROUP BY b.professional_id, j.horas, j.dias;
$$;

-- ── 2) Retención / ciclo de vida, por profesional (filtrado por organización) ─
CREATE OR REPLACE FUNCTION public.panel_pro_retencion(p_org_id uuid)
RETURNS TABLE (
  professional_id uuid,
  activos         int,
  altas           int,
  abandonos       int,
  oportunidad     int,
  completan       int,
  duracion_dias   numeric,
  en_riesgo       int
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH ses AS (
    SELECT
      t.patient_id,
      MODE() WITHIN GROUP (ORDER BY t.professional_id) AS professional_id,
      MIN(t.start_time) AS first_t,
      MAX(t.start_time) FILTER (WHERE t.start_time < now()) AS last_t,
      COUNT(*) FILTER (WHERE t.start_time < now()) AS sesiones,
      COUNT(*) FILTER (WHERE t.start_time >= now()) AS futuros
    FROM public.turnos t
    WHERE t.org_id = p_org_id
      AND t.is_blocked IS NOT TRUE
      AND t.status NOT IN ('cancelado','ausente')
      AND t.patient_id IS NOT NULL
      AND t.professional_id IS NOT NULL
    GROUP BY t.patient_id
  ),
  j AS (
    SELECT s.*, p.discharged_at, p.discharge_reason
    FROM ses s JOIN public.patients p ON p.id = s.patient_id
  )
  SELECT
    professional_id,
    COUNT(*) FILTER (WHERE discharged_at IS NULL)::int AS activos,
    COUNT(*) FILTER (WHERE discharged_at IS NOT NULL AND discharge_reason = 'alta')::int AS altas,
    COUNT(*) FILTER (WHERE discharged_at IS NOT NULL AND discharge_reason = 'abandono')::int AS abandonos,
    COUNT(*) FILTER (WHERE first_t <= now() - interval '6 weeks')::int AS oportunidad,
    COUNT(*) FILTER (
      WHERE first_t <= now() - interval '6 weeks'
        AND (sesiones >= 10 OR (last_t - first_t) >= interval '6 weeks')
    )::int AS completan,
    ROUND((AVG(EXTRACT(EPOCH FROM (discharged_at - first_t))/86400.0)
      FILTER (WHERE discharge_reason = 'alta' AND discharged_at IS NOT NULL))::numeric, 1) AS duracion_dias,
    COUNT(*) FILTER (WHERE discharged_at IS NULL AND futuros = 0 AND last_t <= now() - interval '7 days')::int AS en_riesgo
  FROM j
  GROUP BY professional_id;
$$;

-- ── 3) Clínico: fichas / planes / evaluaciones (filtrado por organización) ──
CREATE OR REPLACE FUNCTION public.panel_pro_clinico(p_org_id uuid, p_from timestamptz, p_to timestamptz)
RETURNS TABLE (
  professional_id        uuid,
  fichas_mes             int,
  planes_mes             int,
  evals_mes              int,
  planes_desactualizados int
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH fichas AS (
    SELECT f.user_id AS pid, COUNT(*)::int AS n
    FROM public.patient_fichas f
    JOIN public.patients p ON p.id = f.patient_id
    WHERE p.org_id = p_org_id
      AND f.updated_at >= p_from AND f.updated_at < p_to
    GROUP BY f.user_id
  ),
  planes AS (
    SELECT ep.user_id AS pid, COUNT(*)::int AS n
    FROM public.exercise_plans ep
    JOIN public.patients p ON p.id = ep.patient_id
    WHERE p.org_id = p_org_id
      AND ep.created_at >= p_from AND ep.created_at < p_to
      AND ep.patient_id IS NOT NULL
    GROUP BY ep.user_id
  ),
  evals AS (
    SELECT e.user_id AS pid, COUNT(*)::int AS n
    FROM (
      SELECT user_id, created_at, patient_id FROM public.rts_evaluations
      UNION ALL SELECT user_id, created_at, patient_id FROM public.dynamometer_results
      UNION ALL SELECT user_id, created_at, patient_id FROM public.questionnaire_results
    ) e
    JOIN public.patients p ON p.id = e.patient_id
    WHERE p.org_id = p_org_id
      AND e.created_at >= p_from AND e.created_at < p_to
    GROUP BY e.user_id
  ),
  pt AS (
    SELECT
      t.patient_id,
      MODE() WITHIN GROUP (ORDER BY t.professional_id) AS prof,
      MAX(t.start_time) FILTER (WHERE t.start_time < now()) AS last_c
    FROM public.turnos t
    WHERE t.org_id = p_org_id
      AND t.is_blocked IS NOT TRUE
      AND t.status NOT IN ('cancelado','ausente')
      AND t.patient_id IS NOT NULL AND t.professional_id IS NOT NULL
    GROUP BY t.patient_id
  ),
  desact AS (
    SELECT pt.prof AS pid, COUNT(*)::int AS n
    FROM pt
    WHERE pt.last_c <= now() - interval '7 days'
      AND pt.last_c >= now() - interval '60 days'
      AND EXISTS (
        SELECT 1 FROM public.patients pp
        WHERE pp.id = pt.patient_id AND pp.discharged_at IS NULL AND pp.org_id = p_org_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.exercise_plans ep
        WHERE ep.patient_id = pt.patient_id
          AND ep.updated_at >= pt.last_c
      )
    GROUP BY pt.prof
  ),
  ids AS (
    SELECT pid FROM fichas
    UNION SELECT pid FROM planes
    UNION SELECT pid FROM evals
    UNION SELECT pid FROM desact
  )
  SELECT
    i.pid AS professional_id,
    COALESCE(f.n, 0) AS fichas_mes,
    COALESCE(p.n, 0) AS planes_mes,
    COALESCE(e.n, 0) AS evals_mes,
    COALESCE(d.n, 0) AS planes_desactualizados
  FROM ids i
  LEFT JOIN fichas f ON f.pid = i.pid
  LEFT JOIN planes p ON p.pid = i.pid
  LEFT JOIN evals  e ON e.pid = i.pid
  LEFT JOIN desact d ON d.pid = i.pid
  WHERE i.pid IS NOT NULL;
$$;
