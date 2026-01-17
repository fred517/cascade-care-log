-- Create storage bucket for site maps
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-maps', 'site-maps', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for site maps
CREATE POLICY "Authenticated users can upload site maps"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-maps');

CREATE POLICY "Authenticated users can view site maps"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'site-maps');

CREATE POLICY "Authenticated users can update their site maps"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'site-maps');

CREATE POLICY "Authenticated users can delete site maps"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site-maps');

-- Create site_maps table
CREATE TABLE public.site_maps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS on site_maps
ALTER TABLE public.site_maps ENABLE ROW LEVEL SECURITY;

-- RLS policies for site_maps
CREATE POLICY "Site members can view site maps"
ON public.site_maps FOR SELECT
USING (public.is_site_member(auth.uid(), site_id));

CREATE POLICY "Site members can create site maps"
ON public.site_maps FOR INSERT
WITH CHECK (public.is_site_member(auth.uid(), site_id));

CREATE POLICY "Site members can update site maps"
ON public.site_maps FOR UPDATE
USING (public.is_site_member(auth.uid(), site_id));

CREATE POLICY "Site members can delete site maps"
ON public.site_maps FOR DELETE
USING (public.is_site_member(auth.uid(), site_id));

-- Create odour_incidents table with FIDOL scale
CREATE TABLE public.odour_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  site_map_id UUID REFERENCES public.site_maps(id) ON DELETE SET NULL,
  
  -- Location on map (relative coordinates 0-100%)
  click_x DECIMAL(5, 2) NOT NULL,
  click_y DECIMAL(5, 2) NOT NULL,
  
  -- GPS coordinates if available
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Date and time of incident
  incident_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- FIDOL Scale
  frequency INTEGER CHECK (frequency >= 1 AND frequency <= 5), -- 1=Rare, 5=Continuous
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5), -- 1=Very Weak, 5=Extremely Strong
  duration INTEGER, -- Duration in minutes
  offensiveness INTEGER CHECK (offensiveness >= 1 AND offensiveness <= 5), -- 1=Not offensive, 5=Extremely offensive
  location_impact TEXT, -- Description of affected area
  
  -- Odour type (extended categories)
  odour_type TEXT CHECK (odour_type IN (
    'septic', 'sulfide', 'ammonia', 'chemical', 'organic_biological', 
    'grease_fat', 'earthy_musty', 'chlorine', 'solvent', 'fuel_oil', 'unknown'
  )),
  
  -- Weather data (auto-fetched)
  wind_speed DECIMAL(5, 2), -- m/s
  wind_direction INTEGER, -- degrees (0-360)
  wind_direction_text TEXT, -- N, NE, E, SE, S, SW, W, NW
  temperature DECIMAL(5, 2), -- Celsius
  humidity INTEGER, -- percentage
  pressure INTEGER, -- hPa
  weather_description TEXT,
  weather_fetched_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes and observations
  notes TEXT,
  source_suspected TEXT, -- Suspected source of odour
  
  -- Corrective actions
  corrective_actions TEXT,
  follow_up_date DATE,
  follow_up_notes TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS on odour_incidents
ALTER TABLE public.odour_incidents ENABLE ROW LEVEL SECURITY;

-- RLS policies for odour_incidents
CREATE POLICY "Site members can view odour incidents"
ON public.odour_incidents FOR SELECT
USING (public.is_site_member(auth.uid(), site_id));

CREATE POLICY "Site members can create odour incidents"
ON public.odour_incidents FOR INSERT
WITH CHECK (public.is_site_member(auth.uid(), site_id));

CREATE POLICY "Site members can update odour incidents"
ON public.odour_incidents FOR UPDATE
USING (public.is_site_member(auth.uid(), site_id));

CREATE POLICY "Supervisors can delete odour incidents"
ON public.odour_incidents FOR DELETE
USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_site_maps_updated_at
BEFORE UPDATE ON public.site_maps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_odour_incidents_updated_at
BEFORE UPDATE ON public.odour_incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();