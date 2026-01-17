-- Create odour_reports table
CREATE TABLE IF NOT EXISTS public.odour_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  observed_at timestamptz NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  weather jsonb NOT NULL,
  odour jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.odour_reports ENABLE ROW LEVEL SECURITY;

-- Site-member access for SELECT
CREATE POLICY "odour_reports_select_site_member"
ON public.odour_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.site_members sm
    WHERE sm.site_id = odour_reports.site_id
      AND sm.user_id = auth.uid()
  )
);

-- Site operator/admin/owner access for INSERT
CREATE POLICY "odour_reports_insert_site_operator"
ON public.odour_reports
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.site_members sm
    WHERE sm.site_id = odour_reports.site_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin', 'operator')
  )
);