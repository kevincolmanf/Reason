-- Auditoría de accesos a fichas clínicas.
--
-- Registra cada vez que un profesional abre la ficha de un paciente, para que
-- el dueño de la organización pueda ver quién accedió a qué información y
-- cuándo (pregunta de un cliente potencial sobre seguridad de datos).
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear feature/auditoria-accesos.

CREATE TABLE IF NOT EXISTS public.ficha_access_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_id uuid REFERENCES public.patient_fichas(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  accessed_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS ficha_access_log_org_idx
  ON public.ficha_access_log (org_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS ficha_access_log_patient_idx
  ON public.ficha_access_log (patient_id, accessed_at DESC);

ALTER TABLE public.ficha_access_log ENABLE ROW LEVEL SECURITY;

-- Insertar: cualquiera que pueda acceder al paciente (dueño o miembro de su org),
-- registrando siempre su propio user_id.
DROP POLICY IF EXISTS "Insert access log for accessible patients" ON public.ficha_access_log;
CREATE POLICY "Insert access log for accessible patients" ON public.ficha_access_log
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = ficha_access_log.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  );

-- Leer: el dueño real de la organización (quien ve la auditoría de todo el
-- equipo) o el propio profesional (su propio historial). No cualquier
-- miembro del equipo: es información sensible sobre quién mira qué.
DROP POLICY IF EXISTS "Read access log as org owner or self" ON public.ficha_access_log;
CREATE POLICY "Read access log as org owner or self" ON public.ficha_access_log
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organizations o WHERE o.id = ficha_access_log.org_id AND o.owner_id = auth.uid()
    ))
  );
