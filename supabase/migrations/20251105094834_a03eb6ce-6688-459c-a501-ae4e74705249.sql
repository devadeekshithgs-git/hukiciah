-- Add RLS policy to allow admins to delete bookings
CREATE POLICY "Admins can delete bookings"
ON public.bookings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));