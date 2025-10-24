-- Update admin role assignment to include huki.ciah@gmail.com
CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the user is one of the admin emails
  IF NEW.email IN ('devadeekshith01@gmail.com', 'sakshibhandari35@gmail.com', 'huki.ciah@gmail.com') THEN
    -- Update their role to admin
    UPDATE public.user_roles
    SET role = 'admin'
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;