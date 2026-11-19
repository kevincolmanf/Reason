-- SEGURIDAD: mismo patrón que el fix del panel de gestión — get_lapsing_patients
-- y get_kine_candidates son SECURITY INVOKER sin filtro de organización en el
-- SQL, confían en que la RLS de turnos/patients ya "scopea" al que llama. Un
-- profesional miembro de MÁS DE UNA organización vería, en el seguimiento de
-- ausencias o en "activar modo kine" de UNA org, pacientes (nombre, teléfono)
-- de OTRA organización de la que también es miembro.
--
-- Ejecutar en Supabase SQL Editor LO ANTES POSIBLE.

-- ── get_lapsing_patients: agrega p_org_id (NULL = contexto personal) ────────
DROP FUNCTION IF EXISTS public.get_lapsing_patients(int, text[]);

CREATE OR REPLACE FUNCTION public.get_lapsing_patients(
  p_threshold_days int DEFAULT 7,
  p_areas text[] DEFAULT NULL,
  p_org_id uuid DEFAULT NULL
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
      AND (
        (p_org_id IS NOT NULL AND t.org_id = p_org_id)
        OR (p_org_id IS NULL AND t.org_id IS NULL AND t.created_by = auth.uid())
      )
    GROUP BY t.patient_id
  ),
  future AS (
    SELECT DISTINCT t.patient_id
    FROM public.turnos t
    WHERE t.patient_id IS NOT NULL
      AND t.start_time >= now()
      AND t.status <> 'cancelado'
      AND (p_areas IS NULL OR array_length(p_areas, 1) IS NULL OR t.area = ANY(p_areas))
      AND (
        (p_org_id IS NOT NULL AND t.org_id = p_org_id)
        OR (p_org_id IS NULL AND t.org_id IS NULL AND t.created_by = auth.uid())
      )
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
    WHERE f.patient_id IS NULL
      AND p.discharged_at IS NULL
      AND (p.absence_snoozed_until IS NULL OR p.absence_snoozed_until < now())
  ) x
  WHERE x.days_since >= p_threshold_days
  ORDER BY x.last_visit ASC;
$$;

-- ── get_kine_candidates: agrega p_org_id (NULL = contexto personal) ─────────
DROP FUNCTION IF EXISTS public.get_kine_candidates(int);

CREATE OR REPLACE FUNCTION public.get_kine_candidates(p_days int DEFAULT 30, p_org_id uuid DEFAULT NULL)
RETURNS TABLE (patient_id uuid, name text, kine_mode boolean, turno_count bigint, last_turno timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT p.id, p.name, COALESCE(p.kine_mode, false),
         count(t.id) AS turno_count, max(t.start_time) AS last_turno
  FROM public.patients p
  JOIN public.turnos t ON t.patient_id = p.id
  WHERE t.start_time >= (now() - make_interval(days => GREATEST(p_days, 1)))
    AND (
      (p_org_id IS NOT NULL AND t.org_id = p_org_id)
      OR (p_org_id IS NULL AND t.org_id IS NULL AND t.created_by = auth.uid())
    )
  GROUP BY p.id, p.name, p.kine_mode
  ORDER BY max(t.start_time) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_kine_candidates(int, uuid) TO authenticated;
