-- Create odour_sources table for defining emission sources
CREATE TABLE IF NOT EXISTS public.odour_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text,
  geometry jsonb NOT NULL,
  base_intensity numeric,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.odour_sources ENABLE ROW LEVEL SECURITY;

-- Site members can view odour sources
CREATE POLICY "odour_sources_select_member"
ON public.odour_sources
FOR SELECT
USING (is_site_member(auth.uid(), site_id));

-- Site members can create odour sources
CREATE POLICY "odour_sources_insert_member"
ON public.odour_sources
FOR INSERT
WITH CHECK (is_site_member(auth.uid(), site_id));

-- Supervisors/admins can update odour sources
CREATE POLICY "odour_sources_update_supervisor"
ON public.odour_sources
FOR UPDATE
USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND is_site_member(auth.uid(), site_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Supervisors/admins can delete odour sources
CREATE POLICY "odour_sources_delete_supervisor"
ON public.odour_sources
FOR DELETE
USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND is_site_member(auth.uid(), site_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create index for faster site queries
CREATE INDEX idx_odour_sources_site ON public.odour_sources(site_id);