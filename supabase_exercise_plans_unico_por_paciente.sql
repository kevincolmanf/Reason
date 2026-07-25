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
-- PASO 2b — FUSIÓN de duplicados CON contenido (si el PASO 3 falla por
-- "duplicate key"). Por cada paciente conserva el plan más antiguo y le mueve las
-- sesiones y registros de los demás, luego borra los duplicados. No pierde datos
-- (pueden quedar dos sesiones el mismo día, que se limpian desde el calendario).
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE scheduled_sessions s
SET plan_id = (
  SELECT q.id FROM exercise_plans q
  WHERE q.patient_id = ep.patient_id
  ORDER BY q.created_at ASC, q.id ASC
  LIMIT 1
)
FROM exercise_plans ep
WHERE s.plan_id = ep.id
  AND ep.patient_id IS NOT NULL
  AND ep.id <> (
    SELECT q.id FROM exercise_plans q
    WHERE q.patient_id = ep.patient_id
    ORDER BY q.created_at ASC, q.id ASC
    LIMIT 1
  );

UPDATE plan_activity_logs l
SET plan_id = (
  SELECT q.id FROM exercise_plans q
  WHERE q.patient_id = ep.patient_id
  ORDER BY q.created_at ASC, q.id ASC
  LIMIT 1
)
FROM exercise_plans ep
WHERE l.plan_id = ep.id
  AND ep.patient_id IS NOT NULL
  AND ep.id <> (
    SELECT q.id FROM exercise_plans q
    WHERE q.patient_id = ep.patient_id
    ORDER BY q.created_at ASC, q.id ASC
    LIMIT 1
  );

DELETE FROM exercise_plans ep
WHERE ep.patient_id IS NOT NULL
  AND ep.id <> (
    SELECT q.id FROM exercise_plans q
    WHERE q.patient_id = ep.patient_id
    ORDER BY q.created_at ASC, q.id ASC
    LIMIT 1
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 3 — ÍNDICE ÚNICO (defensa en profundidad). Un solo plan por paciente a
-- nivel de base de datos. Si falla por "duplicate key", corré antes el PASO 2b.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uniq_exercise_plans_patient
  ON exercise_plans (patient_id)
  WHERE patient_id IS NOT NULL;
