-- Estándares de calidad — campos y tablas nuevas (M2)
--
-- Puramente aditivo: ninguna página de la app lee todavía estas columnas/
-- tablas (eso llega en M3), así que esta migración no cambia el comportamiento
-- de ningún centro. Reversible: DROP COLUMN / DROP TABLE si hiciera falta.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- feature/estandares-calidad-m2-campos-nuevos.

-- ── 1) Fecha de ingreso ──────────────────────────────────────────────────────
-- Hoy la única fecha disponible es patients.created_at (cuándo se cargó el
-- registro en Reason), que no siempre coincide con el ingreso real del
-- paciente (p. ej. si se cargó tarde o viene de otro sistema). admission_date
-- se autocompleta sola (DEFAULT) al crear un paciente nuevo — cero cambios de
-- código en ningún flujo de alta — y queda editable para corregirla en altas
-- migradas de otro sistema. Los que ya existían se completan acá una vez con
-- la fecha de creación del registro, el mejor proxy disponible retroactivo.
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS admission_date date DEFAULT CURRENT_DATE;
UPDATE public.patients SET admission_date = created_at::date WHERE admission_date IS NULL;

-- ── 2) Pases entre áreas (derivaciones) ──────────────────────────────────────
-- Concepto general, no específico de "kinesiología→entrenamiento": from_area/
-- to_area son texto libre, igual que turnos.area y organizations.agenda_areas
-- — cada centro los usa con sus propias áreas configuradas. "Sin informe" se
-- calcula como report_note IS NULL o vacío, no hace falta un booleano aparte.
CREATE TABLE IF NOT EXISTS public.patient_area_transfers (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id      uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  from_area       text,
  to_area         text NOT NULL,
  transferred_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  transferred_at  timestamptz NOT NULL DEFAULT now(),
  report_note     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_area_transfers_patient_idx
  ON public.patient_area_transfers (patient_id, transferred_at);

ALTER TABLE public.patient_area_transfers ENABLE ROW LEVEL SECURITY;

-- Mismo criterio de acceso que patient_events: dueño del paciente o miembro
-- de la organización del paciente (ni un org_id propio en la tabla ni
-- duplicar el scope — una sola fuente de verdad: patients.org_id).
DROP POLICY IF EXISTS "Manage area transfers of accessible patients" ON public.patient_area_transfers;
CREATE POLICY "Manage area transfers of accessible patients" ON public.patient_area_transfers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_area_transfers.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_area_transfers.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  );

-- ── 3) Evaluación de ingreso de entrenamiento (estructurada, configurable) ───
-- Hoy esto vive como texto libre en patient_fichas.ficha_data.recomendacionesTexto.
-- data jsonb guarda las claves que cada centro configuró como obligatorias en
-- organization_feature_settings.config.campos_obligatorios_evaluacion_ingreso
-- (Build: sentadilla_calidad, dorsiflexion_tobillo_der_deg/izq_deg) — ninguna
-- clave está fija en el esquema, así otro centro puede definir las suyas.
-- Una sola evaluación por paciente (igual que exercise_plans), editable.
CREATE TABLE IF NOT EXISTS public.training_intake_evaluations (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id    uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  evaluated_at  date NOT NULL DEFAULT CURRENT_DATE,
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_intake_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manage intake evals of accessible patients" ON public.training_intake_evaluations;
CREATE POLICY "Manage intake evals of accessible patients" ON public.training_intake_evaluations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = training_intake_evaluations.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = training_intake_evaluations.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  );

-- Reusa la función ya existente (creada en supabase_fase2.sql, usada hoy por
-- exercise_plans) en vez de redefinir otra igual.
DROP TRIGGER IF EXISTS update_training_intake_evaluations_modtime ON public.training_intake_evaluations;
CREATE TRIGGER update_training_intake_evaluations_modtime
  BEFORE UPDATE ON public.training_intake_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();
