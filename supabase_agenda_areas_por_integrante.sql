-- Visibilidad de la agenda por ÁREA para cada integrante + escritura solo del dueño
--
-- Qué hace:
--  1) organization_members.agenda_areas: qué áreas puede VER el integrante.
--     NULL = todas las áreas (comportamiento actual). Array = solo esas áreas.
--  2) RLS de turnos reescrita:
--       - LECTURA: el dueño/admin ve todo; el integrante solo ve turnos de sus
--         áreas habilitadas (estricto: aunque sea el profesional de un turno de
--         otra área, no lo ve).
--       - ESCRITURA (insert/update/delete): SOLO el dueño de la organización (o
--         admin). Los integrantes quedan en solo lectura también a nivel API, no
--         solo por interfaz.
--  3) RPC set_member_agenda_areas para que el dueño asigne las áreas.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/agenda-areas-por-integrante.

-- 1) Columna de áreas por integrante (NULL = todas)
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS agenda_areas text[];

-- 2) Helpers -----------------------------------------------------------------

-- ¿El usuario actual es dueño de esta organización?
CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = p_org_id AND owner_id = auth.uid()
  );
END;
$$;

-- ¿El usuario actual puede VER un turno de esta org en esta área?
CREATE OR REPLACE FUNCTION public.can_see_turno_area(p_org_id uuid, p_area text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access boolean;
  v_areas  text[];
BEGIN
  -- Dueño o admin: ve todo
  IF public.is_org_owner(p_org_id) OR public.is_admin() THEN
    RETURN true;
  END IF;

  -- Integrante: requiere acceso habilitado
  SELECT agenda_access, agenda_areas INTO v_access, v_areas
  FROM public.organization_members
  WHERE org_id = p_org_id AND user_id = auth.uid();

  IF NOT FOUND OR v_access IS NOT TRUE THEN
    RETURN false;
  END IF;

  -- Sin restricción de áreas = ve todas
  IF v_areas IS NULL THEN
    RETURN true;
  END IF;

  RETURN p_area = ANY(v_areas);
END;
$$;

-- 3) RPC: el dueño asigna las áreas visibles de un integrante ------------------
CREATE OR REPLACE FUNCTION public.set_member_agenda_areas(
  p_org_id uuid,
  p_user_id uuid,
  p_areas text[]  -- NULL = todas las áreas
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = p_org_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado: solo el dueño de la organización puede cambiar las áreas de la agenda';
  END IF;

  UPDATE public.organization_members
  SET agenda_areas = p_areas
  WHERE org_id = p_org_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_member_agenda_areas(uuid, uuid, text[]) TO authenticated;

-- 4) RLS de turnos ------------------------------------------------------------
-- Reemplaza la política vieja "Org members manage turnos" (FOR ALL) que permitía
-- a cualquier integrante leer y escribir todos los turnos de la org.
DROP POLICY IF EXISTS "Org members manage turnos" ON public.turnos;

-- LECTURA
DROP POLICY IF EXISTS "turnos_select" ON public.turnos;
CREATE POLICY "turnos_select" ON public.turnos
  FOR SELECT
  USING (
    (org_id IS NULL AND created_by = auth.uid())
    OR (org_id IS NOT NULL AND public.can_see_turno_area(org_id, area))
  );

-- ESCRITURA: solo dueño/admin (org) o dueño personal (sin org)
DROP POLICY IF EXISTS "turnos_insert" ON public.turnos;
CREATE POLICY "turnos_insert" ON public.turnos
  FOR INSERT
  WITH CHECK (
    (org_id IS NULL AND created_by = auth.uid())
    OR (org_id IS NOT NULL AND (public.is_org_owner(org_id) OR public.is_admin()))
  );

DROP POLICY IF EXISTS "turnos_update" ON public.turnos;
CREATE POLICY "turnos_update" ON public.turnos
  FOR UPDATE
  USING (
    (org_id IS NULL AND created_by = auth.uid())
    OR (org_id IS NOT NULL AND (public.is_org_owner(org_id) OR public.is_admin()))
  )
  WITH CHECK (
    (org_id IS NULL AND created_by = auth.uid())
    OR (org_id IS NOT NULL AND (public.is_org_owner(org_id) OR public.is_admin()))
  );

DROP POLICY IF EXISTS "turnos_delete" ON public.turnos;
CREATE POLICY "turnos_delete" ON public.turnos
  FOR DELETE
  USING (
    (org_id IS NULL AND created_by = auth.uid())
    OR (org_id IS NOT NULL AND (public.is_org_owner(org_id) OR public.is_admin()))
  );

-- La política "Admin can view all turnos" (FOR SELECT, is_admin) se mantiene.
