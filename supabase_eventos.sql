-- ============================================================================
-- Reason Eventos — Fase 0 (MVP): eventos + inscripciones
-- ============================================================================
-- Un organizador (por ahora Pro/admin) crea un evento con página pública de
-- inscripción. Cada inscripción crea/enlaza una cuenta free (el embudo). La plata
-- de eventos pagos NO pasa por Reason: el organizador guarda su propio medio de
-- cobro (payment_instructions) que se le muestra al inscripto (Fase 3).
-- Correr en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id        uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  location      text,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz,
  cover_emoji   text NOT NULL DEFAULT '🎟️',
  capacity      int,                              -- null = ilimitado
  public_token  text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  price         numeric(12,2) NOT NULL DEFAULT 0, -- 0 = gratis
  payment_instructions text,                      -- CBU / link MP del organizador (Fase 3)
  published     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_creator_idx ON public.events (creator_id, starts_at DESC);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name       text NOT NULL,
  email      text NOT NULL,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_uq ON public.event_registrations (event_id, lower(email));
CREATE INDEX IF NOT EXISTS event_registrations_event_idx ON public.event_registrations (event_id, created_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- events: el organizador maneja los suyos. La página pública lee por token con el
-- admin client (server-side), así que NO hace falta policy pública de lectura.
DROP POLICY IF EXISTS "events_select_own" ON public.events;
CREATE POLICY "events_select_own" ON public.events FOR SELECT USING (creator_id = auth.uid());
DROP POLICY IF EXISTS "events_insert_own" ON public.events;
CREATE POLICY "events_insert_own" ON public.events FOR INSERT WITH CHECK (creator_id = auth.uid());
DROP POLICY IF EXISTS "events_update_own" ON public.events;
CREATE POLICY "events_update_own" ON public.events FOR UPDATE USING (creator_id = auth.uid());
DROP POLICY IF EXISTS "events_delete_own" ON public.events;
CREATE POLICY "events_delete_own" ON public.events FOR DELETE USING (creator_id = auth.uid());

-- registraciones: solo el organizador del evento ve la lista. Las altas entran
-- server-side por el admin client (inscripción pública), no por el cliente.
DROP POLICY IF EXISTS "event_regs_select_creator" ON public.event_registrations;
CREATE POLICY "event_regs_select_creator" ON public.event_registrations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_registrations.event_id AND e.creator_id = auth.uid())
);
