-- Panel de gestión — reconocer los nuevos motivos de alta (M3)
--
-- panel_pro_retencion() solo contaba discharge_reason = 'alta' | 'abandono'.
-- Con la ficha ahora permitiendo también 'derivacion' y 'pausa_acordada'
-- (src/app/dashboard/pacientes/[id]/ficha/AltaPacienteControl.tsx), esos
-- pacientes quedaban con discharged_at seteado pero sin contar en NINGÚN
-- bucket (ni activos, ni altas, ni abandonos) — se "perdían" del panel.
-- Se agregan dos columnas nuevas (derivaciones, pausas); altas/abandonos no
-- cambian de significado. 100% aditivo para cualquier centro: si nunca usa
-- esos motivos, las columnas nuevas quedan en 0.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- feature/estandares-calidad-m1-feature-settings.

DROP FUNCTION IF EXISTS public.panel_pro_retencion(uuid);

CREATE OR REPLACE FUNCTION public.panel_pro_retencion(p_org_id uuid)
RETURNS TABLE (
  professional_id uuid,
  activos         int,
  altas           int,
  derivaciones    int,
  pausas          int,
  abandonos       int,
  oportunidad     int,
  completan       int,
  duracion_dias   numeric,
  en_riesgo       int
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
BEGIN
  IF NOT (public.is_org_owner(p_org_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
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
    j.professional_id,
    COUNT(*) FILTER (WHERE j.discharged_at IS NULL)::int AS activos,
    COUNT(*) FILTER (WHERE j.discharged_at IS NOT NULL AND j.discharge_reason = 'alta')::int AS altas,
    COUNT(*) FILTER (WHERE j.discharged_at IS NOT NULL AND j.discharge_reason = 'derivacion')::int AS derivaciones,
    COUNT(*) FILTER (WHERE j.discharged_at IS NOT NULL AND j.discharge_reason = 'pausa_acordada')::int AS pausas,
    COUNT(*) FILTER (WHERE j.discharged_at IS NOT NULL AND j.discharge_reason = 'abandono')::int AS abandonos,
    COUNT(*) FILTER (WHERE j.first_t <= now() - interval '6 weeks')::int AS oportunidad,
    COUNT(*) FILTER (
      WHERE j.first_t <= now() - interval '6 weeks'
        AND (j.sesiones >= 10 OR (j.last_t - j.first_t) >= interval '6 weeks')
    )::int AS completan,
    ROUND((AVG(EXTRACT(EPOCH FROM (j.discharged_at - j.first_t))/86400.0)
      FILTER (WHERE j.discharge_reason = 'alta' AND j.discharged_at IS NOT NULL))::numeric, 1) AS duracion_dias,
    COUNT(*) FILTER (WHERE j.discharged_at IS NULL AND j.futuros = 0 AND j.last_t <= now() - interval '7 days')::int AS en_riesgo
  FROM j
  GROUP BY j.professional_id;
END;
$$;
