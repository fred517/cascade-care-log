-- Create site_sitemaps table (one sitemap per site, replaces on upload)
CREATE TABLE IF NOT EXISTS public.site_sitemaps (
  site_id uuid PRIMARY KEY REFERENCES public.sites(id) ON DELETE CASCADE,
  storage_bucket text NOT NULL DEFAULT 'site-maps',
  storage_path text NOT NULL,
  public_url text NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on site_sitemaps
ALTER TABLE public.site_sitemaps ENABLE ROW LEVEL SECURITY;

-- RLS policies for site_sitemaps
CREATE POLICY "sitemaps_select_in_org"
ON public.site_sitemaps FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.sites s
    JOIN public.org_members m ON m.org_id = s.org_id
    WHERE s.id = site_sitemaps.site_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "sitemaps_insert_in_org"
ON public.site_sitemaps FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sites s
    JOIN public.org_members m ON m.org_id = s.org_id
    WHERE s.id = site_sitemaps.site_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "sitemaps_update_in_org"
ON public.site_sitemaps FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.sites s
    JOIN public.org_members m ON m.org_id = s.org_id
    WHERE s.id = site_sitemaps.site_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "sitemaps_delete_in_org"
ON public.site_sitemaps FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.sites s
    JOIN public.org_members m ON m.org_id = s.org_id
    WHERE s.id = site_sitemaps.site_id AND m.user_id = auth.uid()
  )
);

-- Add new columns to odour_incidents for the simplified schema
ALTER TABLE public.odour_incidents 
ADD COLUMN IF NOT EXISTS character text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS weather jsonb;

-- Add site_id column if it doesn't exist (maps to existing facility_id concept)
ALTER TABLE public.odour_incidents 
ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_odour_incidents_site_created
ON public.odour_incidents(site_id, created_at DESC);