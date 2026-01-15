-- Create sites table
CREATE TABLE public.sites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    timezone TEXT DEFAULT 'America/New_York',
    ammonia_basis TEXT DEFAULT 'nh3n',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create readings table for storing daily process measurements
CREATE TABLE public.readings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    metric_id TEXT NOT NULL,
    value DECIMAL NOT NULL,
    notes TEXT,
    attachment_url TEXT,
    entered_by UUID NOT NULL REFERENCES auth.users(id),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create thresholds table for site-specific metric thresholds
CREATE TABLE public.thresholds (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    metric_id TEXT NOT NULL,
    min_value DECIMAL NOT NULL,
    max_value DECIMAL NOT NULL,
    enabled BOOLEAN DEFAULT true,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (site_id, metric_id)
);

-- Create site_members table to associate users with sites
CREATE TABLE public.site_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (site_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is member of a site
CREATE OR REPLACE FUNCTION public.is_site_member(_user_id UUID, _site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.site_members
        WHERE user_id = _user_id AND site_id = _site_id
    ) OR public.has_role(_user_id, 'admin')
$$;

-- Sites RLS policies
CREATE POLICY "Users can view sites they are members of"
ON public.sites FOR SELECT
TO authenticated
USING (public.is_site_member(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sites"
ON public.sites FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and supervisors can update sites"
ON public.sites FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'supervisor') AND public.is_site_member(auth.uid(), id)));

-- Readings RLS policies
CREATE POLICY "Users can view readings for their sites"
ON public.readings FOR SELECT
TO authenticated
USING (public.is_site_member(auth.uid(), site_id));

CREATE POLICY "Users can insert readings for their sites"
ON public.readings FOR INSERT
TO authenticated
WITH CHECK (public.is_site_member(auth.uid(), site_id) AND auth.uid() = entered_by);

CREATE POLICY "Users can update their own readings"
ON public.readings FOR UPDATE
TO authenticated
USING (entered_by = auth.uid() OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisors can delete readings"
ON public.readings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'supervisor') AND public.is_site_member(auth.uid(), site_id));

-- Thresholds RLS policies
CREATE POLICY "Users can view thresholds for their sites"
ON public.thresholds FOR SELECT
TO authenticated
USING (public.is_site_member(auth.uid(), site_id));

CREATE POLICY "Supervisors can manage thresholds"
ON public.thresholds FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'supervisor') AND public.is_site_member(auth.uid(), site_id));

-- Site members RLS policies
CREATE POLICY "Users can view site memberships"
ON public.site_members FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage site memberships"
ON public.site_members FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_readings_site_id ON public.readings(site_id);
CREATE INDEX idx_readings_metric_id ON public.readings(metric_id);
CREATE INDEX idx_readings_recorded_at ON public.readings(recorded_at DESC);
CREATE INDEX idx_readings_entered_by ON public.readings(entered_by);
CREATE INDEX idx_thresholds_site_id ON public.thresholds(site_id);
CREATE INDEX idx_site_members_user_id ON public.site_members(user_id);
CREATE INDEX idx_site_members_site_id ON public.site_members(site_id);

-- Update triggers
CREATE TRIGGER update_sites_updated_at
BEFORE UPDATE ON public.sites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_readings_updated_at
BEFORE UPDATE ON public.readings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_thresholds_updated_at
BEFORE UPDATE ON public.thresholds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default site
INSERT INTO public.sites (id, name, timezone) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Main Treatment Plant', 'America/New_York');

-- Insert default thresholds for the main site
INSERT INTO public.thresholds (site_id, metric_id, min_value, max_value) VALUES
('00000000-0000-0000-0000-000000000001', 'svi', 50, 150),
('00000000-0000-0000-0000-000000000001', 'ph', 6.5, 8.5),
('00000000-0000-0000-0000-000000000001', 'do', 2.0, 6.0),
('00000000-0000-0000-0000-000000000001', 'orp', -50, 200),
('00000000-0000-0000-0000-000000000001', 'mlss', 2000, 4000),
('00000000-0000-0000-0000-000000000001', 'ammonia', 0, 5);

-- Function to auto-add new users to default site
CREATE OR REPLACE FUNCTION public.add_user_to_default_site()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.site_members (site_id, user_id)
    VALUES ('00000000-0000-0000-0000-000000000001', NEW.id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_add_to_site
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.add_user_to_default_site();