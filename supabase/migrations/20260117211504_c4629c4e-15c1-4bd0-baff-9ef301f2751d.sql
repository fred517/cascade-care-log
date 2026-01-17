-- Create facilities table
CREATE TABLE IF NOT EXISTS public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create facility_sitemaps table
CREATE TABLE IF NOT EXISTS public.facility_sitemaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_mime text,
  file_name text,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS facility_sitemaps_facility_id_idx ON public.facility_sitemaps(facility_id);

-- Drop existing odour_incidents and recreate with facility-based schema
DROP TABLE IF EXISTS public.odour_incidents CASCADE;

CREATE TABLE public.odour_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  intensity int,
  description text,
  wind_speed double precision,
  wind_dir double precision,
  temperature double precision,
  humidity double precision,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS odour_incidents_facility_id_idx ON public.odour_incidents(facility_id);
CREATE INDEX IF NOT EXISTS odour_incidents_occurred_at_idx ON public.odour_incidents(occurred_at);

-- Enable RLS
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_sitemaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odour_incidents ENABLE ROW LEVEL SECURITY;

-- Facilities policies (org members can view, org admins can manage)
CREATE POLICY "facilities_select_org_member"
  ON public.facilities FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "facilities_insert_org_admin"
  ON public.facilities FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), org_id, ARRAY['owner', 'admin']));

CREATE POLICY "facilities_update_org_admin"
  ON public.facilities FOR UPDATE
  USING (has_org_role(auth.uid(), org_id, ARRAY['owner', 'admin']));

CREATE POLICY "facilities_delete_org_admin"
  ON public.facilities FOR DELETE
  USING (has_org_role(auth.uid(), org_id, ARRAY['owner', 'admin']));

-- Facility sitemaps policies
CREATE POLICY "facility_sitemaps_select_org_member"
  ON public.facility_sitemaps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = facility_id AND is_org_member(auth.uid(), f.org_id)
  ));

CREATE POLICY "facility_sitemaps_insert_org_member"
  ON public.facility_sitemaps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = facility_id AND is_org_member(auth.uid(), f.org_id)
  ));

CREATE POLICY "facility_sitemaps_update_org_admin"
  ON public.facility_sitemaps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = facility_id AND has_org_role(auth.uid(), f.org_id, ARRAY['owner', 'admin'])
  ));

CREATE POLICY "facility_sitemaps_delete_org_admin"
  ON public.facility_sitemaps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = facility_id AND has_org_role(auth.uid(), f.org_id, ARRAY['owner', 'admin'])
  ));

-- Odour incidents policies
CREATE POLICY "odour_incidents_select_org_member"
  ON public.odour_incidents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = facility_id AND is_org_member(auth.uid(), f.org_id)
  ));

CREATE POLICY "odour_incidents_insert_org_member"
  ON public.odour_incidents FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = facility_id AND is_org_member(auth.uid(), f.org_id)
    )
  );

CREATE POLICY "odour_incidents_update_org_member"
  ON public.odour_incidents FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = facility_id AND is_org_member(auth.uid(), f.org_id)
  ));

CREATE POLICY "odour_incidents_delete_org_admin"
  ON public.odour_incidents FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = facility_id AND has_org_role(auth.uid(), f.org_id, ARRAY['owner', 'admin'])
  ));