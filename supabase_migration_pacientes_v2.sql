-- Migración: Fecha de nacimiento y datos de contacto en pacientes
-- Ejecutar en Supabase SQL Editor

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS obra_social text;
