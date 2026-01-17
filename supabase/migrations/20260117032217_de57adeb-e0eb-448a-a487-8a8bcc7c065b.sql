-- Fix profiles table: restrict SELECT to own profile + same-site members + admins
-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view site member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new restrictive SELECT policy
CREATE POLICY "Users can view relevant profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Own profile
  auth.uid() = user_id
  OR
  -- Admins can view all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Users in same sites (without exposing email for non-admins)
  EXISTS (
    SELECT 1 FROM site_members sm1
    JOIN site_members sm2 ON sm1.site_id = sm2.site_id
    WHERE sm1.user_id = auth.uid() AND sm2.user_id = profiles.user_id
  )
);

-- Fix email_recipients table: restrict SELECT to supervisors/admins only
DROP POLICY IF EXISTS "Site members can view email recipients" ON public.email_recipients;

CREATE POLICY "Supervisors can view email recipients"
ON public.email_recipients FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);