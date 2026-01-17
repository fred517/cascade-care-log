-- Drop existing policies on site_members
DROP POLICY IF EXISTS "Admins can manage site memberships" ON public.site_members;
DROP POLICY IF EXISTS "Users can view site memberships" ON public.site_members;

-- SELECT: Users can see their own membership OR if they're site owner/admin
CREATE POLICY "site_members_select_self_or_site_admin"
ON public.site_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR has_site_role(auth.uid(), site_id, ARRAY['owner', 'admin'])
);

-- INSERT: Only site owners/admins can add members
CREATE POLICY "site_members_write_site_admin"
ON public.site_members
FOR INSERT
WITH CHECK (
  has_site_role(auth.uid(), site_id, ARRAY['owner', 'admin'])
);

-- UPDATE: Only site owners/admins can update members
CREATE POLICY "site_members_update_site_admin"
ON public.site_members
FOR UPDATE
USING (
  has_site_role(auth.uid(), site_id, ARRAY['owner', 'admin'])
);

-- DELETE: Only site owners/admins can remove members
CREATE POLICY "site_members_delete_site_admin"
ON public.site_members
FOR DELETE
USING (
  has_site_role(auth.uid(), site_id, ARRAY['owner', 'admin'])
);