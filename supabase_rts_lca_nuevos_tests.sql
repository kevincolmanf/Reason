-- Migración: agregar SL Bridge y Single Leg Squat al protocolo LCA
-- Ejecutar en Supabase SQL Editor

ALTER TABLE rts_evaluations
  -- SL Bridge test: reps afectado/sano (LSI) y calidad
  ADD COLUMN IF NOT EXISTS sl_bridge_affected   NUMERIC,
  ADD COLUMN IF NOT EXISTS sl_bridge_unaffected NUMERIC,
  ADD COLUMN IF NOT EXISTS sl_bridge_quality    TEXT,   -- 'good' | 'acceptable' | 'poor'
  -- Single Leg Squat: calidad observada (valgus, trunk lean, etc.)
  ADD COLUMN IF NOT EXISTS slsquat_quality      TEXT;   -- 'good' | 'acceptable' | 'poor'
