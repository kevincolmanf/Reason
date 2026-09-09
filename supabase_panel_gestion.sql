-- Panel de gestión (Pro) — Fase 1: capa por profesional
--
-- Funciones SQL agregadas que alimentan el panel del dueño. SECURITY INVOKER:
-- corren con los permisos del que llama, así la RLS de turnos/patients ya filtra
-- por la organización. Los profesionales terciarizados son un workspace aparte
-- (no son miembros de la org) → naturalmente no aparecen acá.
--
-- Convenciones (definidas con Kevin):
--   · "Sesión" = turno pasado NO cancelado y NO ausente (proxy: muchos no marcan
--     'presente'). Se cuenta como asistencia.
--   · Paciente → profesional = el profesional que MÁS lo atendió (mode() sobre
--     los turnos del paciente).
--   · "Completa el tratamiento" = ≥10 sesiones O ≥6 semanas (primer→último turno).
--   · % ausencia alerta > 10% · Plan desactualizado = ≥7 días de la consulta sin
--     plan cargado/actualizado (se resuelve en la función clínica, aparte).
--
-- Ejecutar en Supabase SQL Editor antes de mergear feature/panel-gestion-fase1.

-- ── 0) Motivo de baja del paciente ───────────────────────────────────────────
-- Junto a discharged_at (del panel de Ausencias) guardamos POR QUÉ salió del
-- padrón activo: 'alta' (terminó bien) o 'abandono' (dejó el tratamiento). Un
-- paciente ACTIVO = discharged_at IS NULL.
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS discharge_reason text;
-- Los que ya estaban dados de alta (sin motivo) se toman como 'alta'.
UPDATE public.patients SET discharge_reason = 'alta'
  WHERE discharged_at IS NOT NULL AND discharge_reason IS NULL;

-- Se borran primero para poder cambiar la firma (columnas de retorno) al re-correr.
DROP FUNCTION IF EXISTS public.panel_pro_operativo(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.panel_pro_retencion();
DROP FUNCTION IF EXISTS public.panel_pro_clinico(timestamptz, timestamptz);

-- ── 1) Operativo del mes, por profesional ───────────────────────────────────
-- Turnos, asistencia, horas y densidad en un rango [p_from, p_to).
-- OJO: "horas" = HORAS TRABAJADAS = suma del span de la jornada por día
-- (del primer turno al último de ese día), NO la suma de la duración de cada
-- turno. Así "pac/hora" = turnos ÷ horas trabajadas es una densidad real
-- (mismo criterio que la analítica de agenda). Con suma-de-duraciones daba el
-- inverso de la duración del turno (p. ej. 2.0 para todos si son de 30').
CREATE OR REPLACE FUNCTION public.panel_pro_operativo(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (
  professional_id   uuid,
  professional_name text,
  turnos            int,   -- no cancelados
  presentes         int,
  ausentes          int,
  cancelados        int,
  nuevos            int,   -- turnos de tipo primera_vez / ingreso
  horas             numeric,
  dias              int,   -- días distintos con actividad
  pacientes         int    -- pacientes distintos atendidos
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT t.professional_id, t.professional_name, t.status, t.appointment_type,
           t.patient_id, t.start_time, t.end_time
    FROM public.turnos t
    WHERE t.is_blocked IS NOT TRUE
      AND t.professional_id IS NOT NULL
      AND t.start_time >= p_from AND t.start_time < p_to
  ),
  perday AS (  -- span de la jornada por profesional y día (turnos no cancelados)
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

-- ── 2) Retención / ciclo de vida, por profesional ───────────────────────────
-- Sobre TODO el historial (no un mes): para cada paciente calcula su profesional
-- primario, primer/último turno y cantidad de sesiones; luego agrega por profesional.
CREATE OR REPLACE FUNCTION public.panel_pro_retencion()
RETURNS TABLE (
  professional_id uuid,
  activos         int,     -- en tratamiento (sin alta ni abandono)
  altas           int,     -- dados de alta (tratamiento terminado bien)
  abandonos       int,     -- marcados como tratamiento abandonado
  oportunidad     int,     -- primer turno hace ≥6 sem (ya pudieron completar)
  completan       int,     -- proxy automático: ≥10 ses o ≥6 sem, sobre la oportunidad
  duracion_dias   numeric, -- promedio (fecha de alta − primer turno), SOLO altas
  en_riesgo       int      -- activos sin turno futuro y última visita hace ≥7 días
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH ses AS (  -- una fila por paciente: profesional primario + hitos temporales
    SELECT
      t.patient_id,
      MODE() WITHIN GROUP (ORDER BY t.professional_id) AS professional_id,
      MIN(t.start_time) AS first_t,
      MAX(t.start_time) FILTER (WHERE t.start_time < now()) AS last_t,
      COUNT(*) FILTER (WHERE t.start_time < now()) AS sesiones,
      COUNT(*) FILTER (WHERE t.start_time >= now()) AS futuros
    FROM public.turnos t
    WHERE t.is_blocked IS NOT TRUE
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

-- ── 3) Clínico: fichas / planes / evaluaciones / plan desactualizado ─────────
-- El TRABAJO clínico del mes (fichas, planes, evaluaciones) se atribuye a quién
-- lo cargó (user_id del registro). "Plan desactualizado" es un estado del
-- paciente (última consulta hace ≥7 días sin plan actualizado desde entonces) y
-- se atribuye a su profesional primario (igual que en retención).
CREATE OR REPLACE FUNCTION public.panel_pro_clinico(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (
  professional_id        uuid,
  fichas_mes             int,  -- fichas trabajadas (updated_at en el mes)
  planes_mes             int,  -- planes de ejercicio creados en el mes
  evals_mes              int,  -- RTS + dinamometría + cuestionarios del mes
  planes_desactualizados int   -- pacientes con consulta ≥7 días y sin plan al día
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

