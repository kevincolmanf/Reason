-- EVA de dolor estructurado (Fase 1 del plan de estadísticas publicables)
--
-- El EVA 0-10 ya se carga hoy en cada ficha (ficha_data.dolorEva, un botón
-- 0-10 en "Caracterización del dolor" en FichaClient.tsx) pero vive adentro
-- del jsonb, invisible para Estadísticas. Esto lo saca a una columna propia,
-- igual que ya se hizo antes con diagnosis_id/mecanismo_lesion/lateralidad.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- feature/eva-dolor-estructurado.

ALTER TABLE public.patient_fichas
  ADD COLUMN IF NOT EXISTS dolor_eva_inicial integer
    CHECK (dolor_eva_inicial IS NULL OR (dolor_eva_inicial >= 0 AND dolor_eva_inicial <= 10));

-- Backfill de fichas ya cargadas: el selector de la UI solo permite '0'..'10',
-- pero el regex es defensivo por si algún dato viejo tiene otra cosa adentro.
UPDATE public.patient_fichas
SET dolor_eva_inicial = (ficha_data->>'dolorEva')::integer
WHERE dolor_eva_inicial IS NULL
  AND ficha_data->>'dolorEva' ~ '^(10|[0-9])$';
