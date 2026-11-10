-- Toggle por paciente para separar el Monitoreo de Carga avanzado (RPE/VAS/ACWR,
-- pensado para deportistas) del flujo diario con pacientes comunes, donde ese
-- detalle no se llena y solo agrega ruido. Default false: ningún paciente
-- existente cambia de comportamiento al correr esta migración.
--
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/simplificar-atencion-paciente.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS advanced_load_mode boolean NOT NULL DEFAULT false;
