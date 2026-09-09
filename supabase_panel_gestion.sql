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

-- ── 1) Operativo del mes, por profesional ───────────────────────────────────
-- Turnos, asistencia, horas y densidad en un rango [p_from, p_to).
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
  SELECT
    t.professional_id,
    COALESCE(MAX(t.professional_name), '') AS professional_name,
    COUNT(*) FILTER (WHERE t.status <> 'cancelado')::int AS turnos,
    COUNT(*) FILTER (WHERE t.status = 'presente')::int   AS presentes,
    COUNT(*) FILTER (WHERE t.status = 'ausente')::int     AS ausentes,
    COUNT(*) FILTER (WHERE t.status = 'cancelado')::int   AS cancelados,
    COUNT(*) FILTER (WHERE t.status <> 'cancelado' AND t.appointment_type IN ('primera_vez','ingreso'))::int AS nuevos,
    ROUND(COALESCE(SUM(EXTRACT(EPOCH FROM (t.end_time - t.start_time))/3600.0)
      FILTER (WHERE t.status <> 'cancelado'), 0)::numeric, 1) AS horas,
    COUNT(DISTINCT t.start_time::date) FILTER (WHERE t.status <> 'cancelado')::int AS dias,
    COUNT(DISTINCT t.patient_id) FILTER (WHERE t.status <> 'cancelado')::int AS pacientes
  FROM public.turnos t
  WHERE t.is_blocked IS NOT TRUE
    AND t.professional_id IS NOT NULL
    AND t.start_time >= p_from AND t.start_time < p_to
  GROUP BY t.professional_id;
$$;

-- ── 2) Retención / ciclo de vida, por profesional ───────────────────────────
-- Sobre TODO el historial (no un mes): para cada paciente calcula su profesional
-- primario, primer/último turno y cantidad de sesiones; luego agrega por profesional.
CREATE OR REPLACE FUNCTION public.panel_pro_retencion()
RETURNS TABLE (
  professional_id uuid,
  pacientes       int,   -- pacientes atribuidos (con ≥1 sesión)
  oportunidad     int,   -- los que ya pudieron completar (primer turno hace ≥6 sem)
  completan       int,   -- de la oportunidad, los que llegaron a ≥10 ses o ≥6 sem
  duracion_dias   numeric, -- promedio último−primer turno (días)
  en_riesgo       int    -- activos sin turno futuro y última visita hace ≥7 días
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
  )
  SELECT
    professional_id,
    COUNT(*)::int AS pacientes,
    COUNT(*) FILTER (WHERE first_t <= now() - interval '6 weeks')::int AS oportunidad,
    COUNT(*) FILTER (
      WHERE first_t <= now() - interval '6 weeks'
        AND (sesiones >= 10 OR (last_t - first_t) >= interval '6 weeks')
    )::int AS completan,
    ROUND(AVG(EXTRACT(EPOCH FROM (last_t - first_t))/86400.0)
      FILTER (WHERE last_t IS NOT NULL AND sesiones >= 2), 1) AS duracion_dias,
    COUNT(*) FILTER (WHERE futuros = 0 AND last_t <= now() - interval '7 days')::int AS en_riesgo
  FROM ses
  GROUP BY professional_id;
$$;

-- ── 3) Clínico (fichas / planes / evaluaciones / plan desactualizado) ────────
--    Pendiente (siguiente commit): atribución del trabajo clínico por user_id del
--    registro + estado de "plan desactualizado" por paciente.
