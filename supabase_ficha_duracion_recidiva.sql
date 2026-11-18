-- Duración de síntomas + recidiva (Fase 2 del plan de estadísticas publicables)
--
-- Dos campos cortos nuevos en la ficha, al lado de mecanismo de lesión y
-- lateralidad: preguntas clínicas habituales al motivo de consulta (cambian
-- el razonamiento del caso), que de paso quedan estructuradas para
-- Estadísticas — mismo patrón que diagnosis_id/mecanismo_lesion/lateralidad/
-- dolor_eva_inicial.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- feature/duracion-sintomas-recidiva — igual que la Fase 1, esto rompe el
-- guardado de fichas si se mergea antes de correr el SQL (el update de la
-- ficha va a referenciar columnas que todavía no existen).

ALTER TABLE public.patient_fichas
  ADD COLUMN IF NOT EXISTS duracion_sintomas text
    CHECK (duracion_sintomas IS NULL OR duracion_sintomas IN ('agudo', 'subagudo', 'cronico')),
  ADD COLUMN IF NOT EXISTS episodio_recurrente boolean;
