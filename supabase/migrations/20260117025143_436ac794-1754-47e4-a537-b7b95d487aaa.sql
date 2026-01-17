
-- Create calibration schedules table
CREATE TABLE public.calibration_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  meter_name text NOT NULL,
  meter_type text NOT NULL DEFAULT 'general',
  interval_days integer NOT NULL DEFAULT 7,
  last_calibration_at timestamptz,
  next_due_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calibration_schedules ENABLE ROW LEVEL SECURITY;

-- Site members can view calibrations
CREATE POLICY "calibration_schedules_select_member" ON public.calibration_schedules
  FOR SELECT USING (is_site_member(auth.uid(), site_id));

-- Site members can insert calibrations
CREATE POLICY "calibration_schedules_insert_member" ON public.calibration_schedules
  FOR INSERT WITH CHECK (is_site_member(auth.uid(), site_id));

-- Site members can update calibrations
CREATE POLICY "calibration_schedules_update_member" ON public.calibration_schedules
  FOR UPDATE USING (is_site_member(auth.uid(), site_id));

-- Supervisors can delete calibrations
CREATE POLICY "calibration_schedules_delete_supervisor" ON public.calibration_schedules
  FOR DELETE USING (
    (has_role(auth.uid(), 'supervisor'::app_role) AND is_site_member(auth.uid(), site_id))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Create calibration log table
CREATE TABLE public.calibration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.calibration_schedules(id) ON DELETE CASCADE,
  calibrated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  calibrated_at timestamptz NOT NULL DEFAULT now(),
  pre_cal_reading numeric,
  post_cal_reading numeric,
  reference_value numeric,
  deviation_percent numeric,
  passed boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calibration_logs ENABLE ROW LEVEL SECURITY;

-- Policies for calibration logs (through schedule relationship)
CREATE POLICY "calibration_logs_select_member" ON public.calibration_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calibration_schedules cs
      WHERE cs.id = calibration_logs.schedule_id
      AND is_site_member(auth.uid(), cs.site_id)
    )
  );

CREATE POLICY "calibration_logs_insert_member" ON public.calibration_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calibration_schedules cs
      WHERE cs.id = calibration_logs.schedule_id
      AND is_site_member(auth.uid(), cs.site_id)
    )
  );

-- Indexes
CREATE INDEX idx_calibration_schedules_site ON public.calibration_schedules(site_id);
CREATE INDEX idx_calibration_schedules_next_due ON public.calibration_schedules(next_due_at) WHERE is_active = true;
CREATE INDEX idx_calibration_logs_schedule ON public.calibration_logs(schedule_id);

-- Trigger to update timestamps
CREATE TRIGGER update_calibration_schedules_updated_at
  BEFORE UPDATE ON public.calibration_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
