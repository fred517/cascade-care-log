-- Drop existing policy
DROP POLICY IF EXISTS "Users can view sites they are members of" ON public.sites;
DROP POLICY IF EXISTS "sites_select_site_member" ON public.sites;

-- Create new policy allowing site members OR support staff with org permission
CREATE POLICY "sites_select_site_member_or_support"
ON public.sites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.site_members sm
    WHERE sm.site_id = sites.id
      AND sm.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
  OR (
    public.is_support()
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = sites.org_id
        AND o.support_access_enabled = true
    )
  )
);