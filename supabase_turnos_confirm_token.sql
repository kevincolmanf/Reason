-- LINK DE CONFIRMACIÓN DE TURNO
-- Agrega un token único por turno para que el paciente pueda confirmar
-- o cancelar su asistencia desde una página pública (/turno/[token]),
-- sin necesidad de autenticarse.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turnos' AND column_name = 'confirm_token'
  ) THEN
    -- El default volátil hace backfill: cada fila existente recibe un token distinto.
    ALTER TABLE public.turnos
      ADD COLUMN confirm_token uuid NOT NULL DEFAULT gen_random_uuid();

    ALTER TABLE public.turnos
      ADD CONSTRAINT turnos_confirm_token_key UNIQUE (confirm_token);
  END IF;
END $$;

-- Índice para el lookup por token desde la página pública
CREATE INDEX IF NOT EXISTS turnos_confirm_token_idx ON public.turnos (confirm_token);
