-- ============================================================================
-- Modo Kinesiología — Fase 4: activación asistida en tanda
-- ============================================================================
-- Devuelve los pacientes que TIENEN turnos, con su estado de modo kine y cuántos
-- turnos tienen. Es el insumo de la pantalla "Activar modo kine en tanda": el
-- dueño ve de un saque a sus pacientes de kine (los que tienen turnos) y los pasa
-- a modo kine juntos, en vez de uno por uno. Los alumnos de entrenamiento NO
-- aparecen porque no tienen turnos.
--
-- SECURITY INVOKER: corre con los permisos del que llama, así la RLS de patients
-- y de turnos ya limita a lo accesible (su org / sus pacientes).
--
-- Ejecutar en Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_kine_candidates()
RETURNS TABLE (patient_id uuid, name text, kine_mode boolean, turno_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT p.id, p.name, COALESCE(p.kine_mode, false), count(t.id) AS turno_count
  FROM public.patients p
  JOIN public.turnos t ON t.patient_id = p.id
  GROUP BY p.id, p.name, p.kine_mode
  ORDER BY p.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_kine_candidates() TO authenticated;
