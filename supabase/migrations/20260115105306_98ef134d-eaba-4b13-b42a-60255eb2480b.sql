-- ===== SECURITY ENHANCEMENT: Protect Customer Personal Information =====

-- 1. Drop the existing tray availability policy that exposes booking records
DROP POLICY IF EXISTS "Authenticated users can view tray availability" ON public.bookings;

-- 2. Create a more restrictive policy that only allows checking tray availability
-- This policy uses a SECURITY DEFINER function to only return tray_numbers, not customer data
-- The get_booked_trays_for_date function already exists and handles this securely

-- 3. Ensure profiles table is protected from anonymous access
-- The current RLS policies use auth.uid() which returns null for anonymous users,
-- but let's add an explicit authenticated check for defense-in-depth

-- Drop and recreate profiles SELECT policies with explicit authenticated role check
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate with explicit authenticated role requirement
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Also update INSERT and UPDATE policies to be explicit about authenticated role
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 4. Similarly protect bookings table - ensure SELECT policies require authentication
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;

-- Recreate with explicit authenticated role requirement
CREATE POLICY "Users can view own bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own bookings"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all bookings"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete bookings"
  ON public.bookings
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Protect notification_logs from non-admin authenticated users
DROP POLICY IF EXISTS "Admins can view notification logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.notification_logs;

CREATE POLICY "Only admins can view notification logs"
  ON public.notification_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role INSERT - this is for backend functions only
CREATE POLICY "Service role can insert notification logs"
  ON public.notification_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 6. Protect cancellation_credits with explicit authenticated role
DROP POLICY IF EXISTS "Users can view own credits" ON public.cancellation_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON public.cancellation_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.cancellation_credits;

CREATE POLICY "Users can view own credits"
  ON public.cancellation_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
  ON public.cancellation_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON public.cancellation_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add admin policies for cancellation_credits (missing as noted in security scan)
CREATE POLICY "Admins can view all credits"
  ON public.cancellation_credits
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update credits"
  ON public.cancellation_credits
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete credits"
  ON public.cancellation_credits
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Protect freeze_dried_orders with explicit authenticated role
DROP POLICY IF EXISTS "Users can view own freeze-dried orders" ON public.freeze_dried_orders;
DROP POLICY IF EXISTS "Users can insert freeze-dried orders" ON public.freeze_dried_orders;
DROP POLICY IF EXISTS "Admins can view all freeze-dried orders" ON public.freeze_dried_orders;

CREATE POLICY "Users can view own freeze-dried orders"
  ON public.freeze_dried_orders
  FOR SELECT
  TO authenticated
  USING (booking_id IN (
    SELECT id FROM public.bookings WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert freeze-dried orders"
  ON public.freeze_dried_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (booking_id IN (
    SELECT id FROM public.bookings WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all freeze-dried orders"
  ON public.freeze_dried_orders
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. Protect user_roles with explicit authenticated role
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);