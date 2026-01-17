-- Fix RLS policies to explicitly require authentication

-- 1. Fix profiles table - require auth for SELECT
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;
CREATE POLICY "Users can view relevant profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (EXISTS (
    SELECT 1 FROM site_members sm1
    JOIN site_members sm2 ON sm1.site_id = sm2.site_id
    WHERE sm1.user_id = auth.uid() AND sm2.user_id = profiles.user_id
  ))
);

-- 2. Fix email_recipients table - add explicit auth check
DROP POLICY IF EXISTS "Supervisors can view email recipients" ON public.email_recipients;
CREATE POLICY "Supervisors can view email recipients"
ON public.email_recipients FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix organizations table - require auth for SELECT
DROP POLICY IF EXISTS "org_select_member" ON public.organizations;
CREATE POLICY "org_select_member"
ON public.organizations FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), id));

-- 4. Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('reading-attachments', 'site-maps');