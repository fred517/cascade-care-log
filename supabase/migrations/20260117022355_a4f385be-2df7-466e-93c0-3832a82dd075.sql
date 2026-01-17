-- Create weather_snapshots table
CREATE TABLE IF NOT EXISTS public.weather_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL,
  wind_speed_mps numeric,
  wind_direction_deg numeric,
  temperature_c numeric,
  stability_class text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weather_snapshots ENABLE ROW LEVEL SECURITY;

-- Site members can view weather snapshots
CREATE POLICY "weather_snapshots_select_member"
ON public.weather_snapshots
FOR SELECT
USING (is_site_member(auth.uid(), site_id));

-- Site members can insert weather snapshots
CREATE POLICY "weather_snapshots_insert_member"
ON public.weather_snapshots
FOR INSERT
WITH CHECK (is_site_member(auth.uid(), site_id));

-- Supervisors/admins can update weather snapshots
CREATE POLICY "weather_snapshots_update_supervisor"
ON public.weather_snapshots
FOR UPDATE
USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND is_site_member(auth.uid(), site_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Supervisors/admins can delete weather snapshots
CREATE POLICY "weather_snapshots_delete_supervisor"
ON public.weather_snapshots
FOR DELETE
USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND is_site_member(auth.uid(), site_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create index for faster queries
CREATE INDEX idx_weather_snapshots_site_recorded 
ON public.weather_snapshots(site_id, recorded_at DESC);