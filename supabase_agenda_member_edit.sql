-- ============================================================================
-- Agenda — permiso de EDICIÓN por integrante (crear/editar/borrar turnos)
-- ============================================================================
-- Hasta ahora los integrantes entraban en solo lectura; solo el dueño/admin
-- escribía turnos. Esto agrega un permiso "modifica la agenda" por integrante,
-- para que una secretaria pueda operar turnos sin usar la cuenta del dueño.
-- La CONFIGURACIÓN de la agenda (áreas, horarios, compartir, accesos) sigue
-- siendo solo del dueño (se gatea en la app, no acá).
-- Correr en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS agenda_can_edit boolean NOT NULL DEFAULT false;

-- ¿Puede escribir turnos de esta org? Dueño, admin, o integrante habilitado.
CREATE OR REPLACE FUNCTION public.can_edit_org_turnos(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_org_owner(p_org_id)
      OR public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = p_org_id AND user_id = auth.uid() AND agenda_can_edit = true
      );
$$;

-- Reemplaza las policies de escritura para contemplar al integrante habilitado.
DROP POLICY IF EXISTS "turnos_insert" ON public.turnos;
CREATE POLICY "turnos_insert" ON public.turnos
  FOR INSERT
  WITH CHECK (
    (org_id IS NULL AND created_by = auth.uid())
    OR (org_id IS NOT NULL AND public.can_edit_org_turnos(org_id))
  );

DROP POLICY IF EXISTS "turnos_update" ON public.turnos;
CREATE POLICY "turnos_update" ON public.turnos
  FOR UPDATE
  USING (
    (org_id IS NULL AND created_by = auth.uid())
    OR (org_id IS NOT NULL AND public.can_edit_org_turnos(org_id))
  )
  WITH CHECK (
    (org_id IS NULL AND created_by = auth.uid())
    OR (org_id IS NOT NULL AND public.can_edit_org_turnos(org_id))
  );

DROP POLICY IF EXISTS "turnos_delete" ON public.turnos;
CREATE POLICY "turnos_delete" ON public.turnos
  FOR DELETE
  USING (
    (org_id IS NULL AND created_by = auth.uid())
    OR (org_id IS NOT NULL AND public.can_edit_org_turnos(org_id))
  );
