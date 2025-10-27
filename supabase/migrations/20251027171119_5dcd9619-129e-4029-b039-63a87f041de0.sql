-- Drop the SECURITY DEFINER view
DROP VIEW IF EXISTS public.tray_availability;

-- Add RLS policy to allow authenticated users to see tray availability for completed bookings
-- This replaces the SECURITY DEFINER view with a more secure RLS approach
CREATE POLICY "Authenticated users can view tray availability"
ON public.bookings
FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND payment_status = 'completed' 
  AND status = 'active'
);