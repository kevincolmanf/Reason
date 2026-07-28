-- ─────────────────────────────────────────────────────────────────────────────
-- PAPELERA / SOFT-DELETE (Fase 1 — evaluaciones y registros clínicos)
--
-- En vez de agregar `deleted_at` a cada tabla y tener que filtrar decenas de
-- consultas (fácil olvidarse una y que un dato borrado reaparezca), guardamos una
-- COPIA del registro borrado en una única tabla `deleted_records`. El registro se
-- elimina de su tabla original (las consultas existentes siguen igual, sin cambios)
-- y queda recuperable desde la papelera por 30 días. Restaurar = volver a insertar
-- el registro en su tabla original a partir de la copia.
--
-- Fase 1 cubre: rts_evaluations, dynamometer_results, questionnaire_results,
-- patient_events, load_sessions (registros hoja, sin hijos en cascada → restaurar
-- es directo). patients y exercise_plans quedan para una Fase 2.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.deleted_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Qué se borró
  table_name   text NOT NULL,
  record_id    uuid NOT NULL,
  data         jsonb NOT NULL,          -- copia completa de la fila original
  -- Contexto para mostrar y scopear en la papelera
  patient_id   uuid,
  patient_name text,
  label        text,                    -- resumen legible: "RTS · LCA — 2026-07-25"
  org_id       uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Auditoría
  deleted_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deleted_records_deleted_by_idx ON public.deleted_records (deleted_by);
CREATE INDEX IF NOT EXISTS deleted_records_org_id_idx     ON public.deleted_records (org_id);
CREATE INDEX IF NOT EXISTS deleted_records_deleted_at_idx ON public.deleted_records (deleted_at);
CREATE INDEX IF NOT EXISTS deleted_records_patient_id_idx ON public.deleted_records (patient_id);

ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;

-- Visibilidad: quien borró siempre ve/restaura lo suyo; además, si el borrado
-- quedó asociado a una organización, cualquier integrante del equipo puede verlo.
-- Al insertar/restaurar, se exige que deleted_by sea el propio usuario.
DROP POLICY IF EXISTS "deleted_records visibility" ON public.deleted_records;
CREATE POLICY "deleted_records visibility" ON public.deleted_records
  FOR ALL
  USING (
    deleted_by = auth.uid()
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR public.is_admin()
  )
  WITH CHECK (deleted_by = auth.uid());

-- Nota sobre la purga a 30 días: se hace desde la app (borrado físico de las filas
-- de deleted_records con deleted_at < now() - 30 días) al abrir la papelera. Al ser
-- un DELETE sobre deleted_records, la RLS de arriba ya garantiza que cada usuario
-- solo purga lo que le corresponde. No hace falta una función adicional.
