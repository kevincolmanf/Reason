-- Fecha elegible para las evaluaciones RTS (para crearlas/ubicarlas en un día
-- del calendario, no solo en la fecha de creación).
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/rts-crear-desde-calendario.
-- Aditivo: las evaluaciones existentes quedan con evaluation_date NULL y en el
-- calendario se ubican por su created_at (fallback).

ALTER TABLE rts_evaluations
  ADD COLUMN IF NOT EXISTS evaluation_date date;
