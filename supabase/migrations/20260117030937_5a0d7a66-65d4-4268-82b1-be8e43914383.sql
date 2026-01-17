-- Drop existing policy
DROP POLICY IF EXISTS "Users can view readings for their sites" ON public.readings;
DROP POLICY IF EXISTS "readings_select_site_member" ON public.readings;

-- Create new policy allowing site members OR support staff with org permission
CREATE POLICY "readings_select_site_member_or_support"
ON public.readings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.site_members sm
    WHERE sm.site_id = readings.site_id
      AND sm.user_id = auth.uid()
  )
  OR (
    public.is_support()
    AND EXISTS (
      SELECT 1
      FROM public.sites s
      JOIN public.organizations o ON o.id = s.org_id
      WHERE s.id = readings.site_id
        AND o.support_access_enabled = true
    )
  )
);