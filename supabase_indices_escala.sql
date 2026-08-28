-- ============================================================================
-- Higiene de escala #2 — Índices en columnas de filtrado frecuente
-- ============================================================================
-- Contexto: la tabla `patients` (eje del que cuelga todo) no tenía NINGÚN
-- índice más allá de la PK. Cada listado de pacientes por profesional/centro
-- y cada chequeo de RLS (auth.uid() = user_id / is_org_member(org_id)) hacía
-- un sequential scan. Hoy es imperceptible (pocas filas), pero antes de
-- escalar a decenas de centros conviene indexar los caminos de acceso reales.
--
-- Todos son índices ADITIVOS con IF NOT EXISTS: no cambian datos ni políticas,
-- no pueden romper accesos. A este volumen el lock de creación es de milisegundos.
-- Correr en el SQL Editor de Supabase (producción).
-- ============================================================================

-- patients: la tabla eje. Filtrada por user_id (individual) y org_id (equipo).
CREATE INDEX IF NOT EXISTS patients_user_id_idx
  ON public.patients (user_id);

-- Parcial: los pacientes individuales tienen org_id NULL. El índice solo cubre
-- los pacientes de centro, que es exactamente lo que evalúa la política de RLS
-- (org_id IS NOT NULL AND is_org_member(org_id)).
CREATE INDEX IF NOT EXISTS patients_org_id_idx
  ON public.patients (org_id)
  WHERE org_id IS NOT NULL;

-- patient_fichas: se cargan por paciente (historial de fichas).
CREATE INDEX IF NOT EXISTS patient_fichas_patient_id_idx
  ON public.patient_fichas (patient_id);

-- exercise_plans: ya existe un índice único parcial por patient_id, pero se
-- listan y filtran también por user_id (planes del profesional).
CREATE INDEX IF NOT EXISTS exercise_plans_user_id_idx
  ON public.exercise_plans (user_id);

-- subscriptions: se consulta por user_id en el paywall, el checkout y el cron
-- de reconciliación. Tabla chica pero consultada seguido y por usuario.
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx
  ON public.subscriptions (user_id);

-- patient_sources: dropdowns de "vía de llegada" por profesional / centro.
CREATE INDEX IF NOT EXISTS patient_sources_user_id_idx
  ON public.patient_sources (user_id);

CREATE INDEX IF NOT EXISTS patient_sources_org_id_idx
  ON public.patient_sources (org_id)
  WHERE org_id IS NOT NULL;

-- user_exercises: ejercicios propios del profesional, listados por user_id.
CREATE INDEX IF NOT EXISTS user_exercises_user_id_idx
  ON public.user_exercises (user_id);
