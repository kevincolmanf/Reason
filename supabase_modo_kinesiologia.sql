-- ============================================================================
-- Modo Kinesiología — Fase 0 (base invisible)
-- ============================================================================
-- Agrega el flag por paciente que enciende la capa "Atención de hoy".
--
-- SEGURIDAD (crítico): esta migración es 100% aditiva y NO reclasifica a nadie.
-- En Build (y en cualquier centro) hoy conviven en `patients` los alumnos de
-- entrenamiento y los pacientes de kinesiología. Con el default en FALSE, TODOS
-- quedan en modo normal — idénticos a como están hoy. No se corre ningún UPDATE
-- masivo. Nada del modo kine se enciende hasta que el dueño lo prende a mano
-- (o desde la activación asistida por turnos, en una fase posterior).
--
-- Recordá: la preview de Vercel usa la base de producción, así que esta
-- migración debe correrse en Supabase ANTES de mergear la rama (y antes de
-- probar la preview, que ya selecciona la columna nueva).
--
-- Ejecutar en Supabase SQL Editor.
-- ============================================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS kine_mode boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.patients.kine_mode IS
  'Modo Kinesiología: cuando es true, el paciente muestra la capa "Atención de hoy" '
  '(check de síntoma, sugerencia, continuidad, vista de bloque). Default false = '
  'modo normal/entrenamiento, sin cambios. Se prende por paciente, decisión del dueño.';
