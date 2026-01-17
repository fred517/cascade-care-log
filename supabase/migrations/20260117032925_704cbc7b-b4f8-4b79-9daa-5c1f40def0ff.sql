-- Add site_id to email_logs table for site-scoped access control
ALTER TABLE public.email_logs 
ADD COLUMN site_id uuid REFERENCES public.sites(id);

-- Create index for performance
CREATE INDEX idx_email_logs_site_id ON public.email_logs(site_id);

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Supervisors can view email logs" ON public.email_logs;

-- Create new site-scoped SELECT policy
-- Supervisors can only view logs for sites they're members of
-- Admins can view logs for sites they're members of OR logs with no site_id (legacy/system emails)
CREATE POLICY "Supervisors can view site email logs"
ON public.email_logs FOR SELECT
TO authenticated
USING (
  -- Admin can see their site's logs or logs without site_id
  (
    has_role(auth.uid(), 'admin'::app_role) 
    AND (site_id IS NULL OR is_site_member(auth.uid(), site_id))
  )
  OR
  -- Supervisor can only see their site's logs
  (
    has_role(auth.uid(), 'supervisor'::app_role) 
    AND site_id IS NOT NULL 
    AND is_site_member(auth.uid(), site_id)
  )
);