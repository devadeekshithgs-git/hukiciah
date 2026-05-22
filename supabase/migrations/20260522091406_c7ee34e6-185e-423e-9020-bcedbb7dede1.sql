
-- Update the assign_admin_role function to only recognize the single admin email
CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'huki.ciah@gmail.com' THEN
    UPDATE public.user_roles
    SET role = 'admin'
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Demote any existing admins that are NOT the authorized email
UPDATE public.user_roles
SET role = 'customer'
WHERE role = 'admin'
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'huki.ciah@gmail.com'
  );

-- Promote the authorized email to admin (if account exists)
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'huki.ciah@gmail.com'
);
