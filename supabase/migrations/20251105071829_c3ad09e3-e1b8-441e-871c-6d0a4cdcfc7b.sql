-- Add customer information fields for admin-created bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_whatsapp TEXT;

-- Add helpful comments
COMMENT ON COLUMN public.bookings.customer_name IS 'Customer name for admin-created bookings (when admin_created = true)';
COMMENT ON COLUMN public.bookings.customer_whatsapp IS 'Customer WhatsApp number for admin-created bookings (when admin_created = true)';