-- ENUM for organization member roles
CREATE TYPE org_member_role AS ENUM ('admin', 'member');

-- ORGANIZATIONS TABLE
-- Created automatically when a Pro subscription is activated
CREATE TABLE public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null
);

-- ORGANIZATION MEMBERS TABLE
-- Links users (with their own login) to an organization
CREATE TABLE public.organization_members (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role org_member_role default 'member' not null,
  created_at timestamp with time zone default now() not null,
  UNIQUE(org_id, user_id)
);

-- Add org_id to patients (nullable: individual users don't have one)
ALTER TABLE public.patients ADD COLUMN org_id uuid references public.organizations(id) on delete set null;

-- ENABLE RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- HELPER: check if current user belongs to a given org
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: ORGANIZATIONS
CREATE POLICY "Org members can view their organization" ON public.organizations
  FOR SELECT USING (public.is_org_member(id) OR owner_id = auth.uid());

CREATE POLICY "Admin can view all organizations" ON public.organizations
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Owner can update their organization" ON public.organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- RLS: ORGANIZATION MEMBERS
CREATE POLICY "Org members can view their org members" ON public.organization_members
  FOR SELECT USING (public.is_org_member(org_id));

CREATE POLICY "Admin can view all org members" ON public.organization_members
  FOR SELECT USING (public.is_admin());

-- RLS: PATIENTS - update to allow org members to access shared patients
-- Drop existing policy and recreate with org support
DROP POLICY IF EXISTS "Users manage their own patients" ON public.patients;

CREATE POLICY "Users manage their own patients" ON public.patients
  FOR ALL
  USING (
    auth.uid() = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );
