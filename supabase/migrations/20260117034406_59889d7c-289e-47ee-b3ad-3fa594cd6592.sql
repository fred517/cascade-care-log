-- Create table for site-specific metric configuration
CREATE TABLE public.site_metric_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  metric_id TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(site_id, metric_id)
);

-- Enable RLS
ALTER TABLE public.site_metric_config ENABLE ROW LEVEL SECURITY;

-- Policies: Only site members can view, only admins/supervisors can modify
CREATE POLICY "Site members can view metric config"
ON public.site_metric_config FOR SELECT
TO authenticated
USING (is_site_member(auth.uid(), site_id));

CREATE POLICY "Admins can insert metric config"
ON public.site_metric_config FOR INSERT
TO authenticated
WITH CHECK (
  has_site_role(auth.uid(), site_id, ARRAY['admin', 'supervisor'])
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update metric config"
ON public.site_metric_config FOR UPDATE
TO authenticated
USING (
  has_site_role(auth.uid(), site_id, ARRAY['admin', 'supervisor'])
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete metric config"
ON public.site_metric_config FOR DELETE
TO authenticated
USING (
  has_site_role(auth.uid(), site_id, ARRAY['admin', 'supervisor'])
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_site_metric_config_updated_at
BEFORE UPDATE ON public.site_metric_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();