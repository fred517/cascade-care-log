-- Create playbooks table for site-specific action playbooks
CREATE TABLE public.site_playbooks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    metric_id TEXT NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('low', 'high')),
    title TEXT NOT NULL,
    steps TEXT[] NOT NULL DEFAULT '{}',
    reference_links TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (site_id, metric_id, condition)
);

-- Enable RLS
ALTER TABLE public.site_playbooks ENABLE ROW LEVEL SECURITY;

-- Create policies for site members
CREATE POLICY "Site members can view playbooks"
ON public.site_playbooks
FOR SELECT
USING (public.is_site_member(auth.uid(), site_id));

CREATE POLICY "Site admins/supervisors can manage playbooks"
ON public.site_playbooks
FOR ALL
USING (public.has_site_role(auth.uid(), site_id, ARRAY['admin', 'supervisor']))
WITH CHECK (public.has_site_role(auth.uid(), site_id, ARRAY['admin', 'supervisor']));

-- Add trigger for updated_at
CREATE TRIGGER update_site_playbooks_updated_at
BEFORE UPDATE ON public.site_playbooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_site_playbooks_site_metric ON public.site_playbooks(site_id, metric_id);