-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ORG MEMBERSHIP
CREATE TABLE IF NOT EXISTS public.org_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','admin','operator','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- READING VALUES (granular measurements)
CREATE TABLE IF NOT EXISTS public.reading_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id uuid NOT NULL REFERENCES public.readings(id) ON DELETE CASCADE,
  parameter_key text NOT NULL,
  value numeric,
  quality_flag text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add org_id to existing sites table
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add org_id to existing readings table  
ALTER TABLE public.readings
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Helpful index for reading queries
CREATE INDEX IF NOT EXISTS readings_org_site_time ON public.readings(org_id, site_id, recorded_at DESC);

-- Index for reading values
CREATE INDEX IF NOT EXISTS reading_values_reading_id ON public.reading_values(reading_id);

-- ==========================
-- RLS: Enable on new tables
-- ==========================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_values ENABLE ROW LEVEL SECURITY;

-- ==========================
-- Helper function to check org membership
-- ==========================
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

-- Helper function to check org role
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id 
      AND org_id = _org_id
      AND role = ANY(_roles)
  )
$$;

-- ==========================
-- RLS Policies for organizations
-- ==========================
CREATE POLICY "org_select_member"
ON public.organizations
FOR SELECT
USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "org_insert_authenticated"
ON public.organizations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "org_update_admin"
ON public.organizations
FOR UPDATE
USING (public.has_org_role(auth.uid(), id, ARRAY['owner', 'admin']));

-- ==========================
-- RLS Policies for org_members
-- ==========================
CREATE POLICY "org_members_select_member"
ON public.org_members
FOR SELECT
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "org_members_insert_admin"
ON public.org_members
FOR INSERT
WITH CHECK (public.has_org_role(auth.uid(), org_id, ARRAY['owner', 'admin']));

CREATE POLICY "org_members_update_admin"
ON public.org_members
FOR UPDATE
USING (public.has_org_role(auth.uid(), org_id, ARRAY['owner', 'admin']));

CREATE POLICY "org_members_delete_admin"
ON public.org_members
FOR DELETE
USING (public.has_org_role(auth.uid(), org_id, ARRAY['owner', 'admin']));

-- ==========================
-- RLS Policies for reading_values
-- ==========================
CREATE POLICY "reading_values_select_member"
ON public.reading_values
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.readings r
    WHERE r.id = reading_values.reading_id
      AND public.is_site_member(auth.uid(), r.site_id)
  )
);

CREATE POLICY "reading_values_insert_member"
ON public.reading_values
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.readings r
    WHERE r.id = reading_values.reading_id
      AND public.is_site_member(auth.uid(), r.site_id)
  )
);

CREATE POLICY "reading_values_update_member"
ON public.reading_values
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.readings r
    WHERE r.id = reading_values.reading_id
      AND public.is_site_member(auth.uid(), r.site_id)
  )
);

CREATE POLICY "reading_values_delete_supervisor"
ON public.reading_values
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.readings r
    WHERE r.id = reading_values.reading_id
      AND (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))
  )
);