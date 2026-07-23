-- Migración: repeticiones por lado en el Single Leg Squat (protocolo LCA)
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/rtp-single-leg-squat-reps

ALTER TABLE rts_evaluations
  -- Single Leg Squat: reps completadas por lado (además de la calidad observada)
  ADD COLUMN IF NOT EXISTS slsquat_reps_affected   NUMERIC,
  ADD COLUMN IF NOT EXISTS slsquat_reps_unaffected NUMERIC;
