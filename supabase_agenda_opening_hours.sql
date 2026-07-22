-- AGENDA · HORARIO VISIBLE CONFIGURABLE
-- Permite que cada agenda (personal o de organización) defina de qué hora a qué
-- hora se muestra la grilla. Antes estaba fijo de 7:00 a 21:00 en el código.
-- Se guarda en minutos desde medianoche (ej: 420 = 07:00, 1260 = 21:00).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'agenda_day_start') THEN
    ALTER TABLE public.users ADD COLUMN agenda_day_start smallint NOT NULL DEFAULT 420;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'agenda_day_end') THEN
    ALTER TABLE public.users ADD COLUMN agenda_day_end smallint NOT NULL DEFAULT 1260;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'agenda_day_start') THEN
    ALTER TABLE public.organizations ADD COLUMN agenda_day_start smallint NOT NULL DEFAULT 420;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'agenda_day_end') THEN
    ALTER TABLE public.organizations ADD COLUMN agenda_day_end smallint NOT NULL DEFAULT 1260;
  END IF;
END $$;
