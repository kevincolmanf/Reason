-- Recargo opt-in por pacientes extra (plan Individual mensual).
--
-- Un registro por bloque de 10 pacientes comprado (no un contador): cada
-- bloque pudo comprarse a una cotización USD/ARS distinta, y necesitamos
-- saber exactamente qué monto revertir al sacar el último (LIFO).
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/recargo-pacientes-extra.

CREATE TABLE IF NOT EXISTS public.patient_overage_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ars_amount numeric NOT NULL,
  usd_reference numeric NOT NULL DEFAULT 5,
  fx_rate_used numeric NOT NULL,
  fx_source text NOT NULL DEFAULT 'dolarapi',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  added_at timestamptz DEFAULT now() NOT NULL,
  removed_at timestamptz
);

CREATE INDEX IF NOT EXISTS patient_overage_blocks_user_idx
  ON public.patient_overage_blocks (user_id, status);

ALTER TABLE public.patient_overage_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own overage blocks" ON public.patient_overage_blocks;
CREATE POLICY "Users manage their own overage blocks" ON public.patient_overage_blocks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
