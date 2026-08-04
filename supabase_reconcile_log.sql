-- Auditoría de la reconciliación automática de suscripciones.
-- Cada fila registra un cambio de rol aplicado (o detectado en dry-run) por el
-- cron diario que verifica el estado real de cada suscripción contra Mercado Pago.
-- Solo el service role escribe/lee (RLS activo, sin políticas públicas).

CREATE TABLE IF NOT EXISTS public.subscription_reconcile_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  email text,
  previous_role text,
  new_role text,
  mp_subscription_id text,
  mp_status text,          -- estado devuelto por Mercado Pago (authorized/cancelled/paused/pending)
  sub_status text,         -- estado con el que quedó la fila en public.subscriptions
  applied boolean NOT NULL DEFAULT true, -- false si fue dry-run
  reason text,             -- descripción legible del motivo del cambio
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_reconcile_log_run_at_idx
  ON public.subscription_reconcile_log (run_at DESC);
CREATE INDEX IF NOT EXISTS subscription_reconcile_log_user_idx
  ON public.subscription_reconcile_log (user_id);

ALTER TABLE public.subscription_reconcile_log ENABLE ROW LEVEL SECURITY;

-- Permitir que los admins lo consulten desde el panel (además del service role,
-- que ignora RLS). is_admin() ya existe en supabase_schema.sql.
CREATE POLICY "Admins can read reconcile log"
  ON public.subscription_reconcile_log
  FOR SELECT USING (public.is_admin());
