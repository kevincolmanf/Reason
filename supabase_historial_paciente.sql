-- Historial del paciente: línea de tiempo unificada de turnos, bitácora,
-- hitos, plan y carga. Ejecutar en el SQL Editor de Supabase ANTES de
-- mergear feature/historial-paciente.

-- scheduled_sessions es la única de las seis tablas fuente sin índice por
-- patient_id (las otras cinco ya lo tienen) — sin esto, la vista de abajo
-- escanea toda la tabla en vez de ir directo a las filas del paciente.
CREATE INDEX IF NOT EXISTS scheduled_sessions_patient_idx
  ON scheduled_sessions (patient_id, scheduled_date DESC);

-- Vista unificada: una fila por evento de cada una de las seis tablas,
-- misma forma (patient_id, fecha, tipo, resumen, nota, autor, orden, meta).
-- IMPORTANTE: security_invoker = true hace que la vista se ejecute con los
-- permisos de quien consulta, no de quien la creó — así respeta el RLS que
-- ya protege patients/turnos/kine_attentions/etc. Sin esto, cualquier usuario
-- autenticado podría leer el historial de CUALQUIER paciente con solo saber
-- su id, sin importar la organización. Requiere Postgres 15+ (Supabase lo usa
-- desde 2023 en proyectos nuevos); si esta sentencia falla con un error de
-- sintaxis en WITH (...), avisar antes de seguir — significa que el proyecto
-- corre una versión más vieja y hay que resolverlo de otra forma.
CREATE OR REPLACE VIEW patient_timeline
WITH (security_invoker = true) AS

  -- Plan de ejercicio: solo sesiones hasta hoy (no el calendario a futuro).
  SELECT
    id, patient_id, scheduled_date AS event_date, 'plan_session'::text AS event_type,
    COALESCE(session_name, 'Sesión de plan') AS summary,
    NULL::text AS note,
    NULL::text AS author_name,
    scheduled_date::timestamptz AS sort_key,
    jsonb_build_object('plan_id', plan_id, 'completed', completed) AS meta
  FROM scheduled_sessions
  WHERE scheduled_date <= CURRENT_DATE

  UNION ALL

  -- Bitácora (seguimiento simple).
  SELECT
    id, patient_id, activity_date, 'bitacora',
    'Bitácora de actividad',
    note,
    attributed_professional_name,
    activity_date::timestamptz,
    jsonb_build_object('exercises', exercises)
  FROM simple_activity_log

  UNION ALL

  -- Hitos del tratamiento: ordena por cuándo se cargó, no por la fecha que
  -- menciona (puede ser a futuro — ver nota de diseño en el plan de
  -- implementación).
  SELECT
    id, patient_id, created_at::date, 'hito',
    COALESCE(title, type),
    CASE WHEN event_date <> created_at::date
      THEN COALESCE(note || ' — ', '') || 'fecha: ' || to_char(event_date, 'DD/MM/YYYY')
      ELSE note
    END,
    NULL,
    created_at,
    jsonb_build_object('type', type, 'target_date', event_date)
  FROM patient_events

  UNION ALL

  -- Atención de hoy (continuidad).
  SELECT
    id, patient_id, attended_on, 'atencion',
    COALESCE(auto_summary, 'Atención registrada'),
    note,
    COALESCE(attributed_professional_name, professional_name),
    attended_on::timestamptz,
    jsonb_build_object('symptom', symptom)
  FROM kine_attentions

  UNION ALL

  -- Monitoreo de carga avanzado.
  SELECT
    id, patient_id, session_date, 'carga',
    'Sesión de carga' || CASE WHEN rpe IS NOT NULL THEN ' · RPE ' || rpe ELSE '' END,
    notes,
    NULL,
    session_date::timestamptz,
    jsonb_build_object('rpe', rpe, 'source', source)
  FROM load_sessions

  UNION ALL

  -- Historial de turnos: solo hasta hoy (no la agenda futura).
  SELECT
    id, patient_id, start_time::date, 'turno',
    COALESCE(area, 'Turno'),
    notes,
    professional_name,
    start_time,
    jsonb_build_object('status', status)
  FROM turnos
  WHERE patient_id IS NOT NULL AND start_time::date <= CURRENT_DATE;
