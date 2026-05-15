-- AGENDA v2 — Custom areas, sharing, and schedule migration

-- Custom area list per org (null = use app defaults)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS agenda_areas text[];

-- Share link for read-only public access
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS agenda_share_token uuid DEFAULT gen_random_uuid();
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS agenda_share_enabled boolean DEFAULT false;

-- For individual pro users without an org
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agenda_areas text[];

-- Ensure every org has a share token (backfill)
UPDATE public.organizations SET agenda_share_token = gen_random_uuid() WHERE agenda_share_token IS NULL;

-- RPC: fetch turnos by share token (bypasses RLS — reads only when share is enabled)
CREATE OR REPLACE FUNCTION public.get_shared_agenda(
  p_token uuid,
  p_from  timestamptz,
  p_to    timestamptz
)
RETURNS TABLE (
  id                  uuid,
  created_at          timestamptz,
  org_id              uuid,
  created_by          uuid,
  professional_id     uuid,
  professional_name   text,
  patient_id          uuid,
  patient_name        text,
  patient_phone       text,
  patient_email       text,
  patient_age         integer,
  patient_obra_social text,
  start_time          timestamptz,
  end_time            timestamptz,
  area                text,
  status              text,
  notes               text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  SELECT
    t.id, t.created_at, t.org_id, t.created_by,
    t.professional_id, t.professional_name,
    t.patient_id, t.patient_name,
    t.patient_phone, t.patient_email, t.patient_age, t.patient_obra_social,
    t.start_time, t.end_time, t.area, t.status, t.notes
  FROM turnos t
  JOIN organizations o ON o.id = t.org_id
  WHERE o.agenda_share_token = p_token
    AND o.agenda_share_enabled = true
    AND t.start_time >= p_from
    AND t.start_time < p_to
  ORDER BY t.start_time;
$$;

-- RPC: save custom areas for an org
CREATE OR REPLACE FUNCTION public.set_org_agenda_areas(p_org_id uuid, p_areas text[])
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  UPDATE organizations
  SET agenda_areas = p_areas
  WHERE id = p_org_id
    AND (owner_id = auth.uid() OR public.is_admin());
$$;

-- RPC: toggle share for an org
CREATE OR REPLACE FUNCTION public.set_org_agenda_share(p_org_id uuid, p_enabled boolean)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  UPDATE organizations
  SET agenda_share_enabled = p_enabled
  WHERE id = p_org_id
    AND (owner_id = auth.uid() OR public.is_admin())
  RETURNING agenda_share_token;
$$;
