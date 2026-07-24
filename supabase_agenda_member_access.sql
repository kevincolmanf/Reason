-- Acceso a la agenda por integrante (Plan Pro / organizaciones)
--
-- El frontend ya llamaba a set_member_agenda_access(...) para que el dueño
-- habilite/deshabilite el acceso de cada integrante, pero la función NUNCA se
-- había creado. Resultado: el toggle no persistía (fallaba en silencio) y ningún
-- integrante podía entrar a la agenda. Esto la crea.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear fix/agenda-acceso-integrantes.

-- La columna ya existe en producción; el IF NOT EXISTS lo hace seguro/idempotente
-- y deja el repo consistente para entornos nuevos.
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS agenda_access boolean NOT NULL DEFAULT false;

-- Solo el dueño de la organización puede cambiar el acceso de sus integrantes.
-- SECURITY DEFINER porque no hay policy de UPDATE sobre organization_members;
-- la autorización se valida adentro contra organizations.owner_id.
CREATE OR REPLACE FUNCTION public.set_member_agenda_access(
  p_org_id uuid,
  p_user_id uuid,
  p_access boolean
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
    RAISE EXCEPTION 'No autorizado: solo el dueño de la organización puede cambiar el acceso a la agenda';
  END IF;

  UPDATE public.organization_members
  SET agenda_access = p_access
  WHERE org_id = p_org_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_member_agenda_access(uuid, uuid, boolean) TO authenticated;
