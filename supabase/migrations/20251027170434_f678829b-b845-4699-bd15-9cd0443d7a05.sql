-- Security Fix 1: Create restricted view for tray availability
-- This view only exposes booking_date and tray_numbers needed for availability checking
CREATE VIEW public.tray_availability AS
SELECT booking_date, tray_numbers
FROM public.bookings
WHERE payment_status = 'completed' AND status = 'active';

-- Grant SELECT permission on the view to authenticated users
GRANT SELECT ON public.tray_availability TO authenticated;

-- Security Fix 2: Drop overly permissive bookings RLS policy
DROP POLICY IF EXISTS "Users can view all bookings for tray availability" ON public.bookings;

-- Security Fix 3: Restrict notification_logs to admin-only access
DROP POLICY IF EXISTS "Authenticated users can view notification logs" ON public.notification_logs;

CREATE POLICY "Admins can view notification logs"
ON public.notification_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role to insert notification logs (for edge functions)
CREATE POLICY "Service role can insert notification logs"
ON public.notification_logs FOR INSERT
WITH CHECK (true);