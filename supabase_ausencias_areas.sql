-- Seguimiento de ausencias configurable por área
--
-- El centro elige EN QUÉ ÁREAS quiere que se sigan las ausencias (ej: en Build,
-- kinesiología sí, pero traumatología y nutrición no). La config se guarda en
-- la organización; la función filtra los turnos por esas áreas.
--
-- Aditivo. Ejecutar en Supabase SQL Editor antes de mergear feature/ausencias-por-area.

-- Áreas seguidas para ausencias. NULL = todas (comportamiento por defecto).
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS absence_areas text[];

-- La función pasa a aceptar un array de áreas. NULL o vacío = todas.
-- Se borra la versión anterior (1 argumento) para no dejar overloads ambiguos.
DROP FUNCTION IF EXISTS public.get_lapsing_patients(int);

CREATE OR REPLACE FUNCTION public.get_lapsing_patients(
  p_threshold_days int DEFAULT 7,
  p_areas text[] DEFAULT NULL
)
RETURNS TABLE (
  patient_id uuid,
  name text,
  phone text,
  last_visit timestamptz,
  days_since int,
  absence_reminder_sent_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH last_visits AS (
    SELECT t.patient_id, max(t.start_time) AS last_visit
    FROM public.turnos t
    WHERE t.patient_id IS NOT NULL
      AND t.start_time < now()
      AND t.status NOT IN ('cancelado', 'ausente')
      AND (p_areas IS NULL OR array_length(p_areas, 1) IS NULL OR t.area = ANY(p_areas))
    GROUP BY t.patient_id
  ),
  future AS (
    SELECT DISTINCT t.patient_id
    FROM public.turnos t
    WHERE t.patient_id IS NOT NULL
      AND t.start_time >= now()
      AND t.status <> 'cancelado'
      AND (p_areas IS NULL OR array_length(p_areas, 1) IS NULL OR t.area = ANY(p_areas))
  )
  SELECT x.patient_id, x.name, x.phone, x.last_visit, x.days_since, x.absence_reminder_sent_at
  FROM (
    SELECT
      p.id   AS patient_id,
      p.name AS name,
      p.phone AS phone,
      lv.last_visit AS last_visit,
      floor(extract(epoch FROM (now() - lv.last_visit)) / 86400)::int AS days_since,
      p.absence_reminder_sent_at AS absence_reminder_sent_at
    FROM public.patients p
    JOIN last_visits lv ON lv.patient_id = p.id
    LEFT JOIN future f  ON f.patient_id = p.id
    WHERE f.patient_id IS NULL                                           -- sin próximo turno (en las áreas seguidas)
      AND p.discharged_at IS NULL                                        -- no dado de alta
      AND (p.absence_snoozed_until IS NULL OR p.absence_snoozed_until < now())  -- aviso no pausado
  ) x
  WHERE x.days_since >= p_threshold_days
  ORDER BY x.last_visit ASC;
$$;
