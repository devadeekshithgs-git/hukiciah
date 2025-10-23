-- Update function to assign admin role to the two specified emails
CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user is one of the admin emails
  IF NEW.email IN ('devadeekshith01@gmail.com', 'sakshibhandari35@gmail.com') THEN
    -- Update their role to admin
    UPDATE public.user_roles
    SET role = 'admin'
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;