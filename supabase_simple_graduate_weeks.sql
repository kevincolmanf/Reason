-- Umbral de graduación configurable por paciente para el modo seguimiento simple.
-- A las N semanas en la bitácora, aparece el aviso para pasar a plan detallado.
-- Default 3 semanas.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/modo-seguimiento-simple.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS simple_graduate_weeks integer NOT NULL DEFAULT 3;

-- Refresca el caché de esquema de la API (evita el error "schema cache")
NOTIFY pgrst, 'reload schema';
