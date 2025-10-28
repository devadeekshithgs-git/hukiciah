-- Phase 1: Add payment_method column to bookings
ALTER TABLE public.bookings 
ADD COLUMN payment_method text CHECK (payment_method IN ('online', 'request_only', 'cash_on_delivery')) DEFAULT 'online';

-- Phase 2: Add vacuum_packing column to bookings
ALTER TABLE public.bookings 
ADD COLUMN vacuum_packing jsonb DEFAULT '[]'::jsonb;

-- Phase 3: Create freeze_dried_orders table
CREATE TABLE public.freeze_dried_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  product_type text NOT NULL DEFAULT 'paneer',
  total_packets integer NOT NULL CHECK (total_packets >= 1 AND total_packets <= 100),
  grams_per_packet integer NOT NULL CHECK (grams_per_packet >= 50 AND grams_per_packet <= 2000),
  unit_price_per_gram numeric NOT NULL,
  total_cost numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on freeze_dried_orders
ALTER TABLE public.freeze_dried_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for freeze_dried_orders
CREATE POLICY "Users can view own freeze-dried orders"
  ON public.freeze_dried_orders FOR SELECT
  USING (booking_id IN (
    SELECT id FROM public.bookings WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert freeze-dried orders"
  ON public.freeze_dried_orders FOR INSERT
  WITH CHECK (booking_id IN (
    SELECT id FROM public.bookings WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all freeze-dried orders"
  ON public.freeze_dried_orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Phase 4: Set up cron job for daily email notifications
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job to run daily at 6 PM (18:00 IST)
SELECT cron.schedule(
  'daily-appointment-notifications',
  '30 12 * * *', -- 6 PM IST = 12:30 PM UTC (IST is UTC+5:30)
  $$
  SELECT net.http_post(
    url := 'https://xzofhbextodwgaewjvtu.supabase.co/functions/v1/daily-appointment-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6b2ZoYmV4dG9kd2dhZXdqdnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjg1MTksImV4cCI6MjA3NjIwNDUxOX0.mRCcuXCP0ey-o-4opk8TyM23Eq40748pONeJbZUsh94"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);