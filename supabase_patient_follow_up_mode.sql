-- Modalidad de seguimiento por paciente (Propuesta: simplificar la carga de datos)
--
-- presencial: se ve en el centro; el registro lo lleva el kinesiólogo con notas.
--             El portal del paciente no le pide registrar sesiones.
-- online / hibrido: el paciente auto-reporta; el portal le muestra un check-in
--             corto (esfuerzo + un dolor + ¿cumplió?), con el detalle opcional.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/modalidad-seguimiento-paciente.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS follow_up_mode text NOT NULL DEFAULT 'presencial';
