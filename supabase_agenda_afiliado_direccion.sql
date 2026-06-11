-- Migración: agregar N° de afiliado y Dirección a appointments y patients
-- Ejecutar en Supabase SQL Editor

-- 1. Nuevas columnas en la tabla de turnos
ALTER TABLE turnos
  ADD COLUMN IF NOT EXISTS patient_affiliate_number TEXT,
  ADD COLUMN IF NOT EXISTS patient_address TEXT;

-- 2. Nuevas columnas en la tabla de pacientes (para pre-autocompletar)
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS affiliate_number TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;
