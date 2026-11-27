-- Estándares de calidad — generalización a N áreas configurables (R1)
--
-- kine_mode NO se toca (sigue gateando "Atención de hoy" para todos los
-- centros, sin relación con este feature). Se agrega patients.area como
-- concepto PARALELO y nullable, solo usado por "Estándares de calidad": si
-- un centro nunca lo toca, el área efectiva sigue siendo exactamente el
-- viejo binario kine_mode (calculado en las funciones SQL, no acá) — cero
-- cambio de comportamiento para cualquier centro que no la use.
--
-- training_intake_evaluations deja de ser "solo entrenamiento": se le agrega
-- `area`, y la unicidad pasa de (patient_id) a (patient_id, area) — un
-- paciente puede tener una evaluación de ingreso por cada área en la que
-- participa.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- fix/estandares-calidad-n-areas.

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS area text;

ALTER TABLE public.training_intake_evaluations
  ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT 'Entrenamiento';

ALTER TABLE public.training_intake_evaluations
  DROP CONSTRAINT IF EXISTS training_intake_evaluations_patient_id_key;

ALTER TABLE public.training_intake_evaluations
  DROP CONSTRAINT IF EXISTS training_intake_evaluations_patient_id_area_key;
ALTER TABLE public.training_intake_evaluations
  ADD CONSTRAINT training_intake_evaluations_patient_id_area_key UNIQUE (patient_id, area);
