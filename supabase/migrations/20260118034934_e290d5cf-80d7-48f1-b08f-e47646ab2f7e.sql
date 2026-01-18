-- Update the handle_new_user function to populate the new profile fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with all new fields from user metadata
  INSERT INTO public.profiles (
    user_id, 
    email, 
    display_name,
    first_name,
    surname,
    facility_name,
    phone_number
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'surname',
    NEW.raw_user_meta_data->>'facility_name',
    NEW.raw_user_meta_data->>'phone_number'
  );
  
  -- Assign default operator role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator');
  
  RETURN NEW;
END;
$$;