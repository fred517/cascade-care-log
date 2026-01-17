-- Fix email_logs RLS policies - remove public access

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow public read access to email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Allow public insert to email_logs" ON public.email_logs;

-- Create authenticated-only SELECT policy (supervisors and admins only)
CREATE POLICY "Supervisors can view email logs"
ON public.email_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin')
);

-- No INSERT policy needed - edge functions use service role key which bypasses RLS