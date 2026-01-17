
-- Create odour predictions table for storing modeled plume data
CREATE TABLE IF NOT EXISTS public.odour_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.odour_sources(id) ON DELETE CASCADE,
  valid_from timestamptz,
  valid_to timestamptz,
  geometry jsonb NOT NULL,
  peak_intensity numeric,
  model_version text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.odour_predictions ENABLE ROW LEVEL SECURITY;

-- Site members can view predictions
CREATE POLICY "odour_predictions_select_member" ON public.odour_predictions
  FOR SELECT USING (is_site_member(auth.uid(), site_id));

-- Site members can insert predictions
CREATE POLICY "odour_predictions_insert_member" ON public.odour_predictions
  FOR INSERT WITH CHECK (is_site_member(auth.uid(), site_id));

-- Supervisors/admins can update predictions
CREATE POLICY "odour_predictions_update_supervisor" ON public.odour_predictions
  FOR UPDATE USING (
    (has_role(auth.uid(), 'supervisor'::app_role) AND is_site_member(auth.uid(), site_id))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Supervisors/admins can delete predictions
CREATE POLICY "odour_predictions_delete_supervisor" ON public.odour_predictions
  FOR DELETE USING (
    (has_role(auth.uid(), 'supervisor'::app_role) AND is_site_member(auth.uid(), site_id))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Index for efficient queries
CREATE INDEX idx_odour_predictions_site ON public.odour_predictions(site_id);
CREATE INDEX idx_odour_predictions_source ON public.odour_predictions(source_id);
CREATE INDEX idx_odour_predictions_valid ON public.odour_predictions(valid_from, valid_to);
