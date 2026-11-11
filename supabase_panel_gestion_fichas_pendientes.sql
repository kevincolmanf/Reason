-- Suma "fichas_pendientes" a panel_pro_clinico: pacientes activos con consulta
-- ya pasada (7 a 60 días atrás) que NO tienen ninguna fila en patient_fichas
-- (ni siquiera la vacía que se crea al abrir la ficha por primera vez) — es
-- decir, nunca se les abrió la ficha. Distinto de "plan desactualizado"
-- (planes_desactualizados ya existente), que sí tiene una ficha pero el plan
-- quedó viejo. Mismo patrón que el CTE "desact" ya existente, contra
-- patient_fichas en vez de exercise_plans.
--
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/panel-gestion-mejoras.

DROP FUNCTION IF EXISTS public.panel_pro_clinico(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.panel_pro_clinico(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (
  professional_id        uuid,
  fichas_mes             int,  -- fichas trabajadas (updated_at en el mes)
  planes_mes             int,  -- planes de ejercicio creados en el mes
  evals_mes              int,  -- RTS + dinamometría + cuestionarios del mes
  planes_desactualizados int,  -- pacientes con consulta ≥7 días y sin plan al día
  fichas_pendientes      int   -- pacientes con consulta ≥7 días y SIN ninguna ficha
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH fichas AS (
    SELECT f.user_id AS pid, COUNT(*)::int AS n
    FROM public.patient_fichas f
    WHERE f.updated_at >= p_from AND f.updated_at < p_to
    GROUP BY f.user_id
  ),
  planes AS (
    SELECT ep.user_id AS pid, COUNT(*)::int AS n
    FROM public.exercise_plans ep
    WHERE ep.created_at >= p_from AND ep.created_at < p_to
      AND ep.patient_id IS NOT NULL
    GROUP BY ep.user_id
  ),
  evals AS (
    SELECT e.user_id AS pid, COUNT(*)::int AS n
    FROM (
      SELECT user_id, created_at FROM public.rts_evaluations
      UNION ALL SELECT user_id, created_at FROM public.dynamometer_results
      UNION ALL SELECT user_id, created_at FROM public.questionnaire_results
    ) e
    WHERE e.created_at >= p_from AND e.created_at < p_to
    GROUP BY e.user_id
  ),
  pt AS (  -- por paciente: profesional primario + última consulta
    SELECT
      t.patient_id,
      MODE() WITHIN GROUP (ORDER BY t.professional_id) AS prof,
      MAX(t.start_time) FILTER (WHERE t.start_time < now()) AS last_c
    FROM public.turnos t
    WHERE t.is_blocked IS NOT TRUE
      AND t.status NOT IN ('cancelado','ausente')
      AND t.patient_id IS NOT NULL AND t.professional_id IS NOT NULL
    GROUP BY t.patient_id
  ),
  desact AS (  -- pacientes en tratamiento (consulta en los últimos 60d) cuyo plan
               -- no se cargó/actualizó desde la última consulta y ya pasaron ≥7 días
    SELECT pt.prof AS pid, COUNT(*)::int AS n
    FROM pt
    WHERE pt.last_c <= now() - interval '7 days'
      AND pt.last_c >= now() - interval '60 days'
      AND EXISTS (  -- solo pacientes activos (sin alta ni abandono)
        SELECT 1 FROM public.patients pp
        WHERE pp.id = pt.patient_id AND pp.discharged_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.exercise_plans ep
        WHERE ep.patient_id = pt.patient_id
          AND ep.updated_at >= pt.last_c
      )
    GROUP BY pt.prof
  ),
  fichas_pend AS (  -- mismo criterio que "desact", pero nunca se abrió la ficha
    SELECT pt.prof AS pid, COUNT(*)::int AS n
    FROM pt
    WHERE pt.last_c <= now() - interval '7 days'
      AND pt.last_c >= now() - interval '60 days'
      AND EXISTS (
        SELECT 1 FROM public.patients pp
        WHERE pp.id = pt.patient_id AND pp.discharged_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.patient_fichas pf
        WHERE pf.patient_id = pt.patient_id
      )
    GROUP BY pt.prof
  ),
  ids AS (
    SELECT pid FROM fichas
    UNION SELECT pid FROM planes
    UNION SELECT pid FROM evals
    UNION SELECT pid FROM desact
    UNION SELECT pid FROM fichas_pend
  )
  SELECT
    i.pid AS professional_id,
    COALESCE(f.n, 0) AS fichas_mes,
    COALESCE(p.n, 0) AS planes_mes,
    COALESCE(e.n, 0) AS evals_mes,
    COALESCE(d.n, 0) AS planes_desactualizados,
    COALESCE(fp.n, 0) AS fichas_pendientes
  FROM ids i
  LEFT JOIN fichas f ON f.pid = i.pid
  LEFT JOIN planes p ON p.pid = i.pid
  LEFT JOIN evals  e ON e.pid = i.pid
  LEFT JOIN desact d ON d.pid = i.pid
  LEFT JOIN fichas_pend fp ON fp.pid = i.pid
  WHERE i.pid IS NOT NULL;
$$;
