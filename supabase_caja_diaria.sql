-- ============================================================================
-- Caja diaria del centro — Fase 2 (MVP)
-- ============================================================================
-- Permisos (blindados a nivel base con RLS):
--   • Dueño del centro (owner): registra + ve TODO (día, mes, historial).
--   • Integrante con permiso "puede registrar caja" (secretaria): registra + ve
--     SOLO el día de hoy (para el arqueo). No ve mes/historial.
--   • Resto / share de agenda: nada. Compartir la agenda NUNCA expone plata.
-- Correr en el SQL Editor de Supabase (producción).
-- ============================================================================

-- 1) Permiso de caja por integrante
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS can_register_cash boolean NOT NULL DEFAULT false;

-- 2) Movimientos de caja
CREATE TABLE IF NOT EXISTS public.cash_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_date     date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  type           text NOT NULL CHECK (type IN ('ingreso','egreso')),
  amount         numeric(12,2) NOT NULL CHECK (amount >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('efectivo','tarjeta','mp','obra_social','transferencia')),
  area           text,
  patient_id     uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  source         text,
  notes          text,
  created_by     uuid NOT NULL REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cash_entries_org_date_idx ON public.cash_entries (org_id, entry_date);

ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

-- 3) Helper: ¿puede registrar caja en esta org? (dueño o integrante con permiso)
CREATE OR REPLACE FUNCTION public.can_register_org_cash(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations
                 WHERE id = p_org_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.organization_members
                 WHERE org_id = p_org_id AND user_id = auth.uid() AND can_register_cash = true);
$$;

-- 4) RLS
DROP POLICY IF EXISTS "cash_insert" ON public.cash_entries;
CREATE POLICY "cash_insert" ON public.cash_entries
  FOR INSERT WITH CHECK (public.can_register_org_cash(org_id) AND created_by = auth.uid());

-- El dueño ve TODO.
DROP POLICY IF EXISTS "cash_select_owner" ON public.cash_entries;
CREATE POLICY "cash_select_owner" ON public.cash_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.organizations
            WHERE id = cash_entries.org_id AND owner_id = auth.uid())
  );

-- La secretaria (con permiso) ve SOLO el día de hoy.
DROP POLICY IF EXISTS "cash_select_registrar_today" ON public.cash_entries;
CREATE POLICY "cash_select_registrar_today" ON public.cash_entries
  FOR SELECT USING (
    entry_date = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
    AND EXISTS (SELECT 1 FROM public.organization_members
                WHERE org_id = cash_entries.org_id AND user_id = auth.uid() AND can_register_cash = true)
  );

-- Editar/borrar: el dueño, o quien creó el movimiento.
DROP POLICY IF EXISTS "cash_update" ON public.cash_entries;
CREATE POLICY "cash_update" ON public.cash_entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = cash_entries.org_id AND owner_id = auth.uid())
    OR created_by = auth.uid()
  );
DROP POLICY IF EXISTS "cash_delete" ON public.cash_entries;
CREATE POLICY "cash_delete" ON public.cash_entries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = cash_entries.org_id AND owner_id = auth.uid())
    OR created_by = auth.uid()
  );

-- 5) RPC: el dueño habilita/deshabilita el permiso de caja de un integrante
CREATE OR REPLACE FUNCTION public.set_member_cash_access(p_org_id uuid, p_user_id uuid, p_access boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado: solo el dueño puede cambiar el permiso de caja';
  END IF;
  UPDATE public.organization_members SET can_register_cash = p_access
  WHERE org_id = p_org_id AND user_id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_member_cash_access(uuid, uuid, boolean) TO authenticated;
