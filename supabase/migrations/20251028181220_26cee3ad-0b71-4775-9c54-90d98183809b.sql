-- Create trigger to call assign_admin_role function when new user is created
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.assign_admin_role();

-- Also manually fix the existing admin user's role
UPDATE public.user_roles 
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'huki.ciah@gmail.com');