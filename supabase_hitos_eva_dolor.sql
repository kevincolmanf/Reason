-- EVA de dolor en Hitos (Fase 3 del plan de estadísticas publicables)
--
-- El dato que faltaba: una medición de seguimiento para comparar contra el
-- EVA inicial de la ficha (dolor_eva_inicial, Fase 1). En vez de crear una
-- pantalla nueva, se cuelga del flujo que ya existe — "Hitos" — donde ya se
-- marcan Evaluación/Reevaluación/Control/Alta. Útil de entrada para ver la
-- evolución del dolor en la línea de tiempo del paciente, no solo para stats.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- feature/eva-seguimiento-hitos — mismo riesgo que las fases anteriores: sin
-- esto, cualquier alta de hito falla con PGRST204 (columna no encontrada).

ALTER TABLE public.patient_events
  ADD COLUMN IF NOT EXISTS eva_dolor integer
    CHECK (eva_dolor IS NULL OR (eva_dolor >= 0 AND eva_dolor <= 10));
