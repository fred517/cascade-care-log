-- Fix overly permissive INSERT policy on alert_events
-- Drop the permissive policy
DROP POLICY IF EXISTS "Authenticated users can create alerts" ON public.alert_events;

-- Create a more restrictive policy: users can create alerts for their sites
CREATE POLICY "Site members can create alerts"
ON public.alert_events FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if site_id is null (system-wide alerts) and user has supervisor/admin role
  (site_id IS NULL AND (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR
  -- Allow if user is a member of the site
  (site_id IS NOT NULL AND is_site_member(auth.uid(), site_id))
);