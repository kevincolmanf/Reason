-- Seguimiento de ausencias (pacientes que se están perdiendo)
--
-- Panel para la secretaría: pacientes ACTIVOS que hace >= N días que no vienen
-- y NO tienen un próximo turno agendado. Permite avisarles por WhatsApp, darlos
-- de alta (terminó el tratamiento) o pausar el aviso un tiempo.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/seguimiento-ausencias.

-- ── 1) Columnas de estado en patients ───────────────────────────────────────
-- discharged_at:            fecha de alta (terminó el tratamiento) → sale del panel.
-- absence_snoozed_until:    aviso pausado hasta esta fecha (reversible).
-- absence_reminder_sent_at: última vez que se le avisó por ausencia (para el conteo).
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS discharged_at            timestamptz,
  ADD COLUMN IF NOT EXISTS absence_snoozed_until    timestamptz,
  ADD COLUMN IF NOT EXISTS absence_reminder_sent_at timestamptz;

-- Índice para acelerar el group-by por paciente al buscar la última visita.
CREATE INDEX IF NOT EXISTS turnos_patient_id_idx ON public.turnos (patient_id);

-- ── 2) Función: pacientes que se están perdiendo ─────────────────────────────
-- SECURITY INVOKER: corre con los permisos del que llama, así la RLS de turnos
-- y patients ya filtra por organización / usuario automáticamente (no hace falta
-- pasar el scope). Devuelve solo lo que la secretaría necesita ver.
--
-- "Última visita" = último turno PASADO que no esté cancelado ni marcado ausente
-- (un turno 'programado'/'confirmado' cuenta como que vino: la mayoría no marca
-- 'presente'). Un paciente sin ninguna visita real (nunca vino) no aparece.
CREATE OR REPLACE FUNCTION public.get_lapsing_patients(p_threshold_days int DEFAULT 7)
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
    GROUP BY t.patient_id
  ),
  future AS (
    SELECT DISTINCT t.patient_id
    FROM public.turnos t
    WHERE t.patient_id IS NOT NULL
      AND t.start_time >= now()
      AND t.status <> 'cancelado'
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
    WHERE f.patient_id IS NULL                                           -- sin próximo turno
      AND p.discharged_at IS NULL                                        -- no dado de alta
      AND (p.absence_snoozed_until IS NULL OR p.absence_snoozed_until < now())  -- aviso no pausado
  ) x
  WHERE x.days_since >= p_threshold_days
  ORDER BY x.last_visit ASC;
$$;
