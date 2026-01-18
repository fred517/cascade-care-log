-- Create table to track remediation actions taken during readings
CREATE TABLE public.reading_remediations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reading_id UUID NOT NULL REFERENCES public.readings(id) ON DELETE CASCADE,
    metric_id TEXT NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('low', 'high')),
    severity TEXT NOT NULL CHECK (severity IN ('watch', 'alarm')),
    playbook_title TEXT,
    completed_steps INTEGER[] NOT NULL DEFAULT '{}',
    all_steps TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    completed_by UUID NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reading_remediations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Site members can view remediations"
ON public.reading_remediations
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM readings r
    WHERE r.id = reading_remediations.reading_id
    AND public.is_site_member(auth.uid(), r.site_id)
));

CREATE POLICY "Site members can create remediations"
ON public.reading_remediations
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM readings r
    WHERE r.id = reading_remediations.reading_id
    AND public.is_site_member(auth.uid(), r.site_id)
) AND completed_by = auth.uid());

CREATE POLICY "Users can update their own remediations"
ON public.reading_remediations
FOR UPDATE
USING (completed_by = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_reading_remediations_reading ON public.reading_remediations(reading_id);
CREATE INDEX idx_reading_remediations_metric ON public.reading_remediations(metric_id);