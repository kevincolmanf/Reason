-- AGENDA / TURNOS
-- Appointments table for clinic scheduling
-- Areas are free-text (not enum) so they're configurable without migrations

CREATE TABLE public.turnos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,

  -- Org context (required for clinic use; individual professionals can leave null)
  org_id uuid references public.organizations(id) on delete cascade,

  -- Who created this appointment (secretary or professional)
  created_by uuid references public.users(id) on delete set null,

  -- The professional attending (nullable: can be a blocked slot or unassigned)
  professional_id uuid references public.users(id) on delete set null,
  professional_name text, -- denormalized for display when user is deleted

  -- Patient (optional: can be a new patient not yet in the system)
  patient_id uuid references public.patients(id) on delete set null,
  patient_name text not null, -- always stored so display works even without patient record
  patient_phone text,
  patient_email text,
  patient_age integer,
  patient_obra_social text,

  -- When
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,

  -- What
  area text not null default 'Kinesiología',
  status text not null default 'programado',
  -- status values: programado | confirmado | presente | ausente | cancelado | sobreturno

  notes text,

  CONSTRAINT turnos_status_check CHECK (
    status IN ('programado', 'confirmado', 'presente', 'ausente', 'cancelado', 'sobreturno')
  ),
  CONSTRAINT turnos_time_check CHECK (end_time > start_time)
);

-- Index for calendar queries (date range lookups)
CREATE INDEX turnos_start_time_idx ON public.turnos (start_time);
CREATE INDEX turnos_org_id_idx ON public.turnos (org_id);
CREATE INDEX turnos_professional_id_idx ON public.turnos (professional_id);

-- RLS
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;

-- Org members can view and manage all turnos in their org
CREATE POLICY "Org members manage turnos" ON public.turnos
  FOR ALL
  USING (
    org_id IS NOT NULL AND public.is_org_member(org_id)
    OR created_by = auth.uid()
    OR professional_id = auth.uid()
  )
  WITH CHECK (
    org_id IS NOT NULL AND public.is_org_member(org_id)
    OR created_by = auth.uid()
  );

-- Admin can view all
CREATE POLICY "Admin can view all turnos" ON public.turnos
  FOR SELECT USING (public.is_admin());

-- ALTER TABLE statements for users who already ran the previous version
-- (safe to run even if columns already exist — use DO block to avoid errors)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'turnos' AND column_name = 'patient_phone') THEN
    ALTER TABLE public.turnos ADD COLUMN patient_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'turnos' AND column_name = 'patient_email') THEN
    ALTER TABLE public.turnos ADD COLUMN patient_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'turnos' AND column_name = 'patient_age') THEN
    ALTER TABLE public.turnos ADD COLUMN patient_age integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'turnos' AND column_name = 'patient_obra_social') THEN
    ALTER TABLE public.turnos ADD COLUMN patient_obra_social text;
  END IF;
END $$;
