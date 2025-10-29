-- Add admin_created field to bookings table to differentiate admin bookings from customer bookings
ALTER TABLE public.bookings 
ADD COLUMN admin_created boolean DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN public.bookings.admin_created IS 'True if booking was created by admin from tray management interface';