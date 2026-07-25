-- Un plan de ejercicio por paciente: evitar (y limpiar) los planes duplicados
-- que se generaban por doble-submit al crear un plan.
--
-- Contexto del bug: si se creaban dos planes para el mismo paciente, la app
-- redirigía a uno arbitrario y "desaparecían" las sesiones cargadas en el otro.
-- El fix de raíz en el código ya evita crear duplicados nuevos (guarda anti
-- doble-click + "si ya existe, ir al existente"). Esta migración limpia los
-- duplicados históricos y agrega un índice único como defensa en profundidad.
--
-- Ejecutar en el SQL Editor de Supabase por PASOS, revisando el PASO 1 antes de
-- correr el PASO 2 y el PASO 3.

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1 — DETECTAR duplicados (solo lectura). Revisar la salida antes de seguir.
-- Muestra, por cada plan de un paciente con más de un plan, cuánto contenido
-- tiene: sesiones en el calendario y registros de actividad.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  ep.patient_id,
  p.name                                   AS paciente,
  ep.id                                    AS plan_id,
  ep.created_at,
  (SELECT count(*) FROM scheduled_sessions s  WHERE s.plan_id = ep.id) AS sesiones_calendario,
  (SELECT count(*) FROM plan_activity_logs l  WHERE l.plan_id = ep.id) AS registros
FROM exercise_plans ep
JOIN patients p ON p.id = ep.patient_id
WHERE ep.patient_id IN (
  SELECT patient_id
  FROM exercise_plans
  WHERE patient_id IS NOT NULL
  GROUP BY patient_id
  HAVING count(*) > 1
)
ORDER BY ep.patient_id, ep.created_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2 — LIMPIEZA CONSERVADORA. Borra SOLO los planes duplicados que están
-- vacíos (sin sesiones en el calendario y sin registros), dejando siempre al
-- menos un plan por paciente:
--   * se conserva cualquier plan CON contenido;
--   * entre planes todos vacíos, se conserva el más antiguo.
-- Si un paciente tiene DOS o más planes CON contenido, NINGUNO se borra acá
-- (queda para revisión manual) y el PASO 3 fallará avisándote — eso es a propósito.
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM exercise_plans P
WHERE P.patient_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM scheduled_sessions s WHERE s.plan_id = P.id)
  AND NOT EXISTS (SELECT 1 FROM plan_activity_logs l WHERE l.plan_id = P.id)
  AND EXISTS (
    SELECT 1 FROM exercise_plans Q
    WHERE Q.patient_id = P.patient_id
      AND Q.id <> P.id
      AND (
        EXISTS (SELECT 1 FROM scheduled_sessions s2 WHERE s2.plan_id = Q.id)
        OR EXISTS (SELECT 1 FROM plan_activity_logs l2 WHERE l2.plan_id = Q.id)
        OR Q.created_at < P.created_at
        OR (Q.created_at = P.created_at AND Q.id < P.id)
      )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 3 — ÍNDICE ÚNICO (defensa en profundidad). Un solo plan por paciente a
-- nivel de base de datos. Si esto falla por "duplicate key", quedaron duplicados
-- con contenido: volvé al PASO 1, resolvelos a mano y reintentá.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uniq_exercise_plans_patient
  ON exercise_plans (patient_id)
  WHERE patient_id IS NOT NULL;
