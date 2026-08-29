-- ============================================================================
-- Caja — enlazar el cobro al turno (para la marca "$" en la agenda)
-- ============================================================================
-- El cobro puede cargarse un día distinto al del turno (entry_date = hoy), así
-- que enlazamos por turno_id en vez de por fecha. Nullable: los cobros que no
-- vienen de un turno quedan sin enlazar.
-- Correr en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

ALTER TABLE public.cash_entries
  ADD COLUMN IF NOT EXISTS turno_id uuid REFERENCES public.turnos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cash_entries_turno_idx ON public.cash_entries (turno_id);
