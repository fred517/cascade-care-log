-- Create report_templates table
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  date_range_type TEXT NOT NULL DEFAULT 'custom',
  date_range_days INTEGER,
  custom_start_date DATE,
  custom_end_date DATE,
  default_title TEXT,
  default_notes TEXT,
  selected_metrics TEXT[],
  default_view_mode TEXT DEFAULT 'table',
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates and shared templates for their sites
CREATE POLICY "Users can view own and shared templates"
ON public.report_templates
FOR SELECT
USING (
  user_id = auth.uid() 
  OR (is_shared = true AND (site_id IS NULL OR is_site_member(auth.uid(), site_id)))
);

-- Users can create their own templates
CREATE POLICY "Users can create templates"
ON public.report_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
ON public.report_templates
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
ON public.report_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();