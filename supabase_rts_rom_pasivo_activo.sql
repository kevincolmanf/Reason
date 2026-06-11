-- Migración: diferenciar ROM pasivo y activo en rts_evaluations
-- Ejecutar en Supabase SQL Editor

ALTER TABLE rts_evaluations
  ADD COLUMN IF NOT EXISTS rom_extension_passive NUMERIC,
  ADD COLUMN IF NOT EXISTS rom_extension_active  NUMERIC,
  ADD COLUMN IF NOT EXISTS rom_flexion_passive   NUMERIC,
  ADD COLUMN IF NOT EXISTS rom_flexion_active    NUMERIC;

-- Migrar datos existentes: copiar los valores actuales a ambas columnas
UPDATE rts_evaluations
SET
  rom_extension_passive = rom_extension,
  rom_extension_active  = rom_extension,
  rom_flexion_passive   = rom_flexion,
  rom_flexion_active    = rom_flexion
WHERE rom_extension IS NOT NULL OR rom_flexion IS NOT NULL;
