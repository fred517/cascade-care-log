-- Fix user_roles visibility: scope admin access to users within the same sites
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create new SELECT policy: users see own roles, admins see roles of users in their sites
CREATE POLICY "Users can view relevant roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  -- Own role
  auth.uid() = user_id
  OR
  -- Admins can see roles of users in the same sites
  (
    has_role(auth.uid(), 'admin'::app_role) 
    AND EXISTS (
      SELECT 1 FROM site_members sm1
      JOIN site_members sm2 ON sm1.site_id = sm2.site_id
      WHERE sm1.user_id = auth.uid() AND sm2.user_id = user_roles.user_id
    )
  )
);

-- Admins can only manage roles for users in their sites
CREATE POLICY "Admins can insert roles for site members"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM site_members sm1
    JOIN site_members sm2 ON sm1.site_id = sm2.site_id
    WHERE sm1.user_id = auth.uid() AND sm2.user_id = user_roles.user_id
  )
);

CREATE POLICY "Admins can update roles for site members"
ON public.user_roles FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM site_members sm1
    JOIN site_members sm2 ON sm1.site_id = sm2.site_id
    WHERE sm1.user_id = auth.uid() AND sm2.user_id = user_roles.user_id
  )
);

CREATE POLICY "Admins can delete roles for site members"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM site_members sm1
    JOIN site_members sm2 ON sm1.site_id = sm2.site_id
    WHERE sm1.user_id = auth.uid() AND sm2.user_id = user_roles.user_id
  )
);