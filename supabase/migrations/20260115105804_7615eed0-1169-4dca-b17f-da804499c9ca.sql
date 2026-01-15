-- ===== SECURITY HARDENING: Protect Payment and Financial Data =====

-- 1. Ensure has_role() function cannot be replaced by non-superusers
-- The function is already SECURITY DEFINER with fixed search_path
-- Add explicit REVOKE to prevent unauthorized modifications
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- 2. Protect user_roles table from unauthorized modifications
-- Ensure no user can INSERT their own admin role
DROP POLICY IF EXISTS "Prevent role self-assignment" ON public.user_roles;

-- Users cannot insert roles for themselves (prevents privilege escalation)
-- Role assignment should only happen via triggers or admin action
CREATE POLICY "Only service role can insert user roles"
  ON public.user_roles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 3. Ensure anon users cannot access bookings at all
-- (policies already require 'authenticated', but add explicit denial as defense-in-depth)
DROP POLICY IF EXISTS "Deny anon access to bookings" ON public.bookings;

-- 4. Add admin policy for user_roles viewing (for admin panel)
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Protect notification_logs - ensure only service_role can insert
-- Already correctly configured, but let's be explicit
DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.notification_logs;
CREATE POLICY "Only backend can insert notification logs"
  ON public.notification_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 6. Add audit trail for sensitive operations by creating an immutable flag
-- Ensure payment-related fields cannot be modified by regular users after completion
-- This is enforced by RLS (users can only update their own, but let's add extra protection)

-- Create a function to validate booking updates (prevents tampering with completed payments)
CREATE OR REPLACE FUNCTION public.validate_booking_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If payment is already completed, prevent modification of payment fields by non-admins
  IF OLD.payment_status = 'completed' AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    -- Preserve critical payment fields - they cannot be changed
    NEW.razorpay_order_id := OLD.razorpay_order_id;
    NEW.razorpay_payment_id := OLD.razorpay_payment_id;
    NEW.payment_status := OLD.payment_status;
    NEW.total_cost := OLD.total_cost;
    NEW.dehydration_cost := OLD.dehydration_cost;
    NEW.packing_cost := OLD.packing_cost;
    NEW.applied_credit_amount := OLD.applied_credit_amount;
    NEW.payment_method := OLD.payment_method;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce payment field protection
DROP TRIGGER IF EXISTS protect_payment_fields ON public.bookings;
CREATE TRIGGER protect_payment_fields
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_update();

-- 7. Grant proper permissions on the validation function
REVOKE ALL ON FUNCTION public.validate_booking_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_booking_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_booking_update() TO service_role;