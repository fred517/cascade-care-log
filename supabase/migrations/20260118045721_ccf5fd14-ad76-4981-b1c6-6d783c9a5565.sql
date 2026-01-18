-- Drop the existing restrictive policy for org_members insert
DROP POLICY IF EXISTS "org_members_insert_admin" ON public.org_members;

-- Create a new policy that allows:
-- 1. Users with admin role (from user_roles) to insert any org member
-- 2. Users who are already owner/admin of the org to add members
CREATE POLICY "org_members_insert_admin_or_global_admin"
ON public.org_members
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_org_role(auth.uid(), org_id, ARRAY['owner'::text, 'admin'::text])
);

-- Also update site_members insert policy to allow global admins
DROP POLICY IF EXISTS "site_members_write_site_admin" ON public.site_members;

CREATE POLICY "site_members_insert_admin_or_site_admin"
ON public.site_members
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_site_role(auth.uid(), site_id, ARRAY['owner'::text, 'admin'::text])
);