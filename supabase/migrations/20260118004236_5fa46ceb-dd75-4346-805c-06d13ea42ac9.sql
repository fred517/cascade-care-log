-- Add org_id and storage columns to site_maps
ALTER TABLE public.site_maps 
ADD COLUMN IF NOT EXISTS org_id uuid,
ADD COLUMN IF NOT EXISTS storage_bucket text,
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS mime_type text;

-- Add org_id to odour_incidents
ALTER TABLE public.odour_incidents
ADD COLUMN IF NOT EXISTS org_id uuid,
ADD COLUMN IF NOT EXISTS source text;

-- Make facility_id nullable since we're transitioning to org_id/site_id based system
ALTER TABLE public.odour_incidents
ALTER COLUMN facility_id DROP NOT NULL;

-- Create index for odour_incidents by org/site/time
CREATE INDEX IF NOT EXISTS odour_incidents_org_site_time_idx
  ON public.odour_incidents (org_id, site_id, occurred_at DESC);

-- Add unique constraint for site_maps (one map per org+site combo) if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'site_maps_org_site_unique'
  ) THEN
    ALTER TABLE public.site_maps ADD CONSTRAINT site_maps_org_site_unique UNIQUE (org_id, site_id);
  END IF;
EXCEPTION WHEN others THEN
  -- Constraint may fail if there's duplicate data, that's okay
  NULL;
END $$;