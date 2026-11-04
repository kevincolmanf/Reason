-- Ejecutar en Supabase SQL Editor antes de mergear feature/user-exercises-por-organizacion
-- Comparte "Mis Ejercicios" a nivel organización, igual que patients (ver supabase_organizations.sql)

ALTER TABLE public.user_exercises
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Backfill: los ejercicios ya cargados pasan a ser visibles para todo el equipo
-- del creador (dueño de organización o integrante), no solo para él.
UPDATE public.user_exercises ue
SET org_id = o.id
FROM public.organizations o
WHERE o.owner_id = ue.user_id
  AND ue.org_id IS NULL;

UPDATE public.user_exercises ue
SET org_id = om.org_id
FROM public.organization_members om
WHERE om.user_id = ue.user_id
  AND ue.org_id IS NULL;

DROP POLICY IF EXISTS "Users manage their own exercises" ON public.user_exercises;

CREATE POLICY "Users manage their own and org exercises" ON public.user_exercises
  FOR ALL
  USING (auth.uid() = user_id OR (org_id IS NOT NULL AND public.is_org_member(org_id)))
  WITH CHECK (auth.uid() = user_id OR (org_id IS NOT NULL AND public.is_org_member(org_id)));
