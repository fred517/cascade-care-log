-- Fix profiles table exposure - restrict to own profile or site members
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can view profiles of site members in their sites
CREATE POLICY "Users can view site member profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.site_members sm1
    JOIN public.site_members sm2 ON sm1.site_id = sm2.site_id
    WHERE sm1.user_id = auth.uid() 
    AND sm2.user_id = profiles.user_id
  )
);