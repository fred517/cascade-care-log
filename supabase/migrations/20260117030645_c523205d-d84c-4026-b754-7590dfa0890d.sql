ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS support_access_enabled boolean NOT NULL DEFAULT false;