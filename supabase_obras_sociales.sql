-- ============================================================================
-- Obras sociales configurables (feedback de Hernán #1)
-- ============================================================================
-- Reemplaza el texto libre de obra social por una lista gestionable, por CENTRO
-- (org_id) o por ESPACIO PERSONAL (user_id). Se siembra con un set estándar de
-- Argentina; cada uno puede agregar, editar y borrar los suyos (incluidos los
-- estándar de su propia lista). El paciente sigue guardando el NOMBRE en su campo
-- obra_social (texto), así los datos viejos siguen mostrándose; esta lista es solo
-- el catálogo para elegir de un toque.
-- Correr en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.obras_sociales (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Exactamente un dueño: o un centro, o un usuario (nunca ambos ni ninguno).
  CONSTRAINT obras_sociales_scope CHECK (
    (org_id IS NOT NULL AND user_id IS NULL) OR (org_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS obras_sociales_org_name_uq  ON public.obras_sociales (org_id, lower(name)) WHERE org_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS obras_sociales_user_name_uq ON public.obras_sociales (user_id, lower(name)) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS obras_sociales_org_idx  ON public.obras_sociales (org_id, sort_order);
CREATE INDEX IF NOT EXISTS obras_sociales_user_idx ON public.obras_sociales (user_id, sort_order);

ALTER TABLE public.obras_sociales ENABLE ROW LEVEL SECURITY;

-- ¿Puede tocar esta fila? El propio usuario (fila personal) o un integrante del
-- centro (fila de org). Se usa igual para leer y escribir: quien opera pacientes
-- de ese contexto administra su catálogo.
DROP POLICY IF EXISTS "obras_select" ON public.obras_sociales;
CREATE POLICY "obras_select" ON public.obras_sociales
  FOR SELECT USING (
    (user_id = auth.uid())
    OR (org_id IS NOT NULL AND (public.is_org_member(org_id) OR public.is_org_owner(org_id)))
  );
DROP POLICY IF EXISTS "obras_insert" ON public.obras_sociales;
CREATE POLICY "obras_insert" ON public.obras_sociales
  FOR INSERT WITH CHECK (
    (user_id = auth.uid())
    OR (org_id IS NOT NULL AND (public.is_org_member(org_id) OR public.is_org_owner(org_id)))
  );
DROP POLICY IF EXISTS "obras_update" ON public.obras_sociales;
CREATE POLICY "obras_update" ON public.obras_sociales
  FOR UPDATE USING (
    (user_id = auth.uid())
    OR (org_id IS NOT NULL AND (public.is_org_member(org_id) OR public.is_org_owner(org_id)))
  );
DROP POLICY IF EXISTS "obras_delete" ON public.obras_sociales;
CREATE POLICY "obras_delete" ON public.obras_sociales
  FOR DELETE USING (
    (user_id = auth.uid())
    OR (org_id IS NOT NULL AND (public.is_org_member(org_id) OR public.is_org_owner(org_id)))
  );

-- Set estándar de Argentina (editable/borrable después por cada uno).
-- Sembramos los CENTROS existentes y los ESPACIOS PERSONALES que ya tienen
-- pacientes. Los nuevos se siembran on-demand desde la app.
INSERT INTO public.obras_sociales (org_id, name, sort_order)
SELECT o.id, s.name, s.ord
FROM public.organizations o
CROSS JOIN (VALUES
  ('OSDE',0),('Swiss Medical',1),('Galeno',2),('OMINT',3),('Medifé',4),
  ('Medicus',5),('PAMI',6),('IOMA',7),('OSDEPYM',8),('OSECAC',9),
  ('Sancor Salud',10),('Particular',11)
) AS s(name, ord)
ON CONFLICT DO NOTHING;

INSERT INTO public.obras_sociales (user_id, name, sort_order)
SELECT DISTINCT p.user_id, s.name, s.ord
FROM public.patients p
CROSS JOIN (VALUES
  ('OSDE',0),('Swiss Medical',1),('Galeno',2),('OMINT',3),('Medifé',4),
  ('Medicus',5),('PAMI',6),('IOMA',7),('OSDEPYM',8),('OSECAC',9),
  ('Sancor Salud',10),('Particular',11)
) AS s(name, ord)
WHERE p.org_id IS NULL AND p.user_id IS NOT NULL
ON CONFLICT DO NOTHING;
