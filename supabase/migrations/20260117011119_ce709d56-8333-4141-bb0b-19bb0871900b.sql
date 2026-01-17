-- Fix alert_events RLS policies - require authentication
DROP POLICY IF EXISTS "Allow public read access to alert_events" ON public.alert_events;
DROP POLICY IF EXISTS "Allow public insert to alert_events" ON public.alert_events;
DROP POLICY IF EXISTS "Allow public update to alert_events" ON public.alert_events;

-- Authenticated users can view alerts (site members if site_id is set, otherwise all authenticated)
CREATE POLICY "Authenticated users can view alerts"
ON public.alert_events FOR SELECT
TO authenticated
USING (
  site_id IS NULL OR public.is_site_member(auth.uid(), site_id)
);

-- Authenticated users can create alerts
CREATE POLICY "Authenticated users can create alerts"
ON public.alert_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- Supervisors can update alerts
CREATE POLICY "Supervisors can update alerts"
ON public.alert_events FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin')
);

-- Fix email_recipients RLS policies - require authentication and site membership
DROP POLICY IF EXISTS "Allow public read access to email_recipients" ON public.email_recipients;
DROP POLICY IF EXISTS "Allow public insert to email_recipients" ON public.email_recipients;
DROP POLICY IF EXISTS "Allow public update to email_recipients" ON public.email_recipients;
DROP POLICY IF EXISTS "Allow public delete from email_recipients" ON public.email_recipients;

-- Site members can view recipients for their sites
CREATE POLICY "Site members can view email recipients"
ON public.email_recipients FOR SELECT
TO authenticated
USING (
  site_id IS NULL OR public.is_site_member(auth.uid(), site_id)
);

-- Supervisors can manage email recipients
CREATE POLICY "Supervisors can insert email recipients"
ON public.email_recipients FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Supervisors can update email recipients"
ON public.email_recipients FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Supervisors can delete email recipients"
ON public.email_recipients FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin')
);