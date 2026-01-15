-- Create comparison_annotations table for tracking anomalies
CREATE TABLE public.comparison_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  metric_id TEXT NOT NULL,
  comparison_type TEXT NOT NULL CHECK (comparison_type IN ('week', 'month')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  note TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comparison_annotations ENABLE ROW LEVEL SECURITY;

-- Users can view annotations for their sites
CREATE POLICY "Users can view annotations for their sites"
ON public.comparison_annotations
FOR SELECT
USING (is_site_member(auth.uid(), site_id));

-- Users can create annotations for their sites
CREATE POLICY "Users can create annotations"
ON public.comparison_annotations
FOR INSERT
WITH CHECK (is_site_member(auth.uid(), site_id) AND auth.uid() = user_id);

-- Users can update their own annotations, supervisors can update any
CREATE POLICY "Users can update annotations"
ON public.comparison_annotations
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR (has_role(auth.uid(), 'supervisor') AND is_site_member(auth.uid(), site_id))
);

-- Users can delete their own annotations, supervisors can delete any
CREATE POLICY "Users can delete annotations"
ON public.comparison_annotations
FOR DELETE
USING (
  user_id = auth.uid() 
  OR (has_role(auth.uid(), 'supervisor') AND is_site_member(auth.uid(), site_id))
);

-- Add trigger for updated_at
CREATE TRIGGER update_comparison_annotations_updated_at
BEFORE UPDATE ON public.comparison_annotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();