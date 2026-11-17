-- Diagnóstico estructurado y datos del episodio en cada ficha. diagnosis_id
-- no tiene FK única por la misma razón que occupation_id en
-- patient_clinical_profile: puede apuntar a diagnosis_catalog (global) o a
-- diagnosis_catalog_custom — diagnosis_source dice en cuál buscar.
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/datos-clinicos-estructurados.

ALTER TABLE patient_fichas
  ADD COLUMN IF NOT EXISTS diagnosis_id uuid,
  ADD COLUMN IF NOT EXISTS diagnosis_source text CHECK (diagnosis_source IN ('global', 'custom')),
  ADD COLUMN IF NOT EXISTS mecanismo_lesion text CHECK (mecanismo_lesion IN ('traumatico', 'sobreuso', 'degenerativo')),
  ADD COLUMN IF NOT EXISTS lateralidad text CHECK (lateralidad IN ('derecha', 'izquierda', 'bilateral', 'no_aplica'));
