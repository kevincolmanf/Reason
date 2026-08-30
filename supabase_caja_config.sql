-- ============================================================================
-- Caja diaria — Configuración (Fase 2, pulido)
-- ============================================================================
-- Agrega:
--   • Medios de pago configurables por centro (tabla cash_payment_methods).
--   • Cobros rápidos / presets configurables (tabla cash_presets): etiqueta +
--     monto + medio/área opcionales, editables cuando cambian los precios.
--   • Campo "concept" en los movimientos (qué se cobró), aparte de la nota libre.
-- Permisos: el dueño Y las secretarias con permiso de caja pueden configurar
--   (misma función can_register_org_cash de la migración anterior).
-- Correr en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

-- 0) El medio de pago deja de estar limitado al set fijo: ahora es configurable.
ALTER TABLE public.cash_entries DROP CONSTRAINT IF EXISTS cash_entries_payment_method_check;

-- Concepto del movimiento (lo llena el cobro rápido; ej. "OSDE", "Particular").
ALTER TABLE public.cash_entries ADD COLUMN IF NOT EXISTS concept text;

-- ============================================================================
-- 1) Medios de pago por centro
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cash_payment_methods (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);
CREATE INDEX IF NOT EXISTS cash_payment_methods_org_idx ON public.cash_payment_methods (org_id, sort_order);
ALTER TABLE public.cash_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpm_select" ON public.cash_payment_methods;
CREATE POLICY "cpm_select" ON public.cash_payment_methods
  FOR SELECT USING (public.can_register_org_cash(org_id));
DROP POLICY IF EXISTS "cpm_insert" ON public.cash_payment_methods;
CREATE POLICY "cpm_insert" ON public.cash_payment_methods
  FOR INSERT WITH CHECK (public.can_register_org_cash(org_id));
DROP POLICY IF EXISTS "cpm_update" ON public.cash_payment_methods;
CREATE POLICY "cpm_update" ON public.cash_payment_methods
  FOR UPDATE USING (public.can_register_org_cash(org_id));
DROP POLICY IF EXISTS "cpm_delete" ON public.cash_payment_methods;
CREATE POLICY "cpm_delete" ON public.cash_payment_methods
  FOR DELETE USING (public.can_register_org_cash(org_id));

-- Sembrar los medios por defecto en los centros que YA existen (editables después).
INSERT INTO public.cash_payment_methods (org_id, name, sort_order)
SELECT o.id, m.name, m.ord
FROM public.organizations o
CROSS JOIN (VALUES
  ('Efectivo', 0), ('Tarjeta', 1), ('Mercado Pago', 2),
  ('Obra social', 3), ('Transferencia', 4)
) AS m(name, ord)
ON CONFLICT (org_id, name) DO NOTHING;

-- ============================================================================
-- 2) Cobros rápidos (presets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cash_presets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label          text NOT NULL,
  type           text NOT NULL DEFAULT 'ingreso' CHECK (type IN ('ingreso','egreso')),
  amount         numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  payment_method text,
  area           text,
  sort_order     int NOT NULL DEFAULT 0,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cash_presets_org_idx ON public.cash_presets (org_id, sort_order);
ALTER TABLE public.cash_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpre_select" ON public.cash_presets;
CREATE POLICY "cpre_select" ON public.cash_presets
  FOR SELECT USING (public.can_register_org_cash(org_id));
DROP POLICY IF EXISTS "cpre_insert" ON public.cash_presets;
CREATE POLICY "cpre_insert" ON public.cash_presets
  FOR INSERT WITH CHECK (public.can_register_org_cash(org_id));
DROP POLICY IF EXISTS "cpre_update" ON public.cash_presets;
CREATE POLICY "cpre_update" ON public.cash_presets
  FOR UPDATE USING (public.can_register_org_cash(org_id));
DROP POLICY IF EXISTS "cpre_delete" ON public.cash_presets;
CREATE POLICY "cpre_delete" ON public.cash_presets
  FOR DELETE USING (public.can_register_org_cash(org_id));
