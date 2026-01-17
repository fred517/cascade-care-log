-- Update is_support() to check user_roles table for 'support' role
CREATE OR REPLACE FUNCTION public.is_support()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'support'
  )
$$;