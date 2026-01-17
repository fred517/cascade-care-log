-- Add role column to site_members
ALTER TABLE public.site_members 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'operator' 
CHECK (role IN ('owner', 'admin', 'operator', 'viewer'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS site_members_user_site_idx ON public.site_members(user_id, site_id);

-- Create helper function to check site roles
CREATE OR REPLACE FUNCTION public.has_site_role(_user_id uuid, _site_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.site_members
    WHERE user_id = _user_id 
      AND site_id = _site_id
      AND role = ANY(_roles)
  )
$$;