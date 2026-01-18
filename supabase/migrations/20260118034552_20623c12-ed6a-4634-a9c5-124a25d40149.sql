-- Add new profile fields for registration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS surname TEXT,
ADD COLUMN IF NOT EXISTS facility_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add first_name column (rename from display_name usage)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_facility_name ON public.profiles(facility_name);

-- Ensure the support role can access all sites
-- This is already handled by existing RLS policies with is_support() check