-- Allow global admins to view all organizations (Admin Panel needs this)
DROP POLICY IF EXISTS "org_select_global_admin" ON public.organizations;
CREATE POLICY "org_select_global_admin"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow global admins to view all org memberships (member counts + member list)
DROP POLICY IF EXISTS "org_members_select_global_admin" ON public.org_members;
CREATE POLICY "org_members_select_global_admin"
ON public.org_members
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
