-- Fecha elegible para los cuestionarios (para crearlos/ubicarlos en un día del
-- calendario del plan, igual que los hitos, el RTS y la dinamometría).
--
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/cuestionarios-en-calendario.
-- Aditivo: los cuestionarios existentes quedan con evaluation_date NULL y en el
-- calendario se ubican por su created_at (fallback).

ALTER TABLE questionnaire_results
  ADD COLUMN IF NOT EXISTS evaluation_date date;
