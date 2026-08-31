-- ============================================================================
-- Reason Eventos — Fase 1: check-in + certificados
-- ============================================================================
-- Check-in de asistencia por inscripto + campos para el certificado (template de
-- Reason: entidad + firma que completa el organizador al enviar). El certificado
-- se ve en una página pública por token (cert_token) que se manda por mail.
-- Correr en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS checked_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_token text UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  ADD COLUMN IF NOT EXISTS certificate_sent_at timestamptz;

-- Datos del certificado que fija el organizador (se guardan en el evento).
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS cert_entity text,
  ADD COLUMN IF NOT EXISTS cert_signer text,
  ADD COLUMN IF NOT EXISTS cert_signer_role text;

-- El organizador puede actualizar las inscripciones de SUS eventos (para el
-- check-in). Las altas siguen entrando server-side; esto habilita el update.
DROP POLICY IF EXISTS "event_regs_update_creator" ON public.event_registrations;
CREATE POLICY "event_regs_update_creator" ON public.event_registrations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_registrations.event_id AND e.creator_id = auth.uid())
);
