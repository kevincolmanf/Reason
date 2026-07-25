-- Fecha elegible para las evaluaciones de dinamometría (para crearlas/ubicarlas
-- en un día del calendario del plan, igual que los hitos y el RTS).
--
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/dinamometria-en-calendario.
-- Aditivo: las evaluaciones existentes quedan con evaluation_date NULL y en el
-- calendario se ubican por su created_at (fallback).

ALTER TABLE dynamometer_results
  ADD COLUMN IF NOT EXISTS evaluation_date date;
