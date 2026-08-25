-- RECORDATORIO ENVIADO (persistente en base)
-- Antes el estado "recordatorio enviado" vivía solo en localStorage del navegador:
-- era por dispositivo y no lo compartía el equipo. Esta columna lo lleva a la base
-- para que la agenda y la página de recordatorios queden sincronizadas entre todos
-- los integrantes y todos los dispositivos, y para saber CUÁNDO se envió.
--
-- NULL = todavía no se envió recordatorio. timestamp = momento del último envío.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turnos' AND column_name = 'reminder_sent_at'
  ) THEN
    ALTER TABLE public.turnos
      ADD COLUMN reminder_sent_at timestamptz;
  END IF;
END $$;

-- Índice parcial para listar rápido los turnos de un día que ya tienen recordatorio.
CREATE INDEX IF NOT EXISTS turnos_reminder_sent_at_idx
  ON public.turnos (reminder_sent_at)
  WHERE reminder_sent_at IS NOT NULL;
