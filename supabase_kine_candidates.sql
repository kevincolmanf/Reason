-- ============================================================================
-- Modo Kinesiología — Fase 4: activación asistida en tanda
-- ============================================================================
-- Devuelve los pacientes con turnos RECIENTES (por defecto, últimos 30 días),
-- con su estado de modo kine, cuántos turnos y la fecha del último. Es el insumo
-- de "Activar modo kine en tanda".
--
-- Por qué "recientes" y no "todos": en un centro, muchos pacientes TERMINAN la
-- kinesiología y se quedan entrenando. Como el entrenamiento no agenda turnos,
-- esa gente queda con turnos viejos. Si contáramos todos los turnos de la
-- historia, aparecerían como candidatos aunque hoy ya no hagan kine. Filtrando
-- por turnos recientes, solo aparecen los pacientes ACTUALMENTE en kine.
--
-- SECURITY INVOKER: la RLS de patients y turnos ya limita a lo accesible.
--
-- Ejecutar en Supabase SQL Editor. (Reemplaza la versión anterior sin parámetro.)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_kine_candidates();
DROP FUNCTION IF EXISTS public.get_kine_candidates(int);

CREATE OR REPLACE FUNCTION public.get_kine_candidates(p_days int DEFAULT 30)
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
  GROUP BY p.id, p.name, p.kine_mode
  ORDER BY max(t.start_time) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_kine_candidates(int) TO authenticated;
