-- Add cancellation credits table
CREATE TABLE public.cancellation_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_booking_id UUID REFERENCES public.bookings(id),
  credit_amount NUMERIC(10,2) NOT NULL,
  expiry_date DATE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_in_booking_id UUID REFERENCES public.bookings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cancellation_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON public.cancellation_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
  ON public.cancellation_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON public.cancellation_credits FOR UPDATE
  USING (auth.uid() = user_id);

-- Add blocked trays table
CREATE TABLE public.blocked_trays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  tray_numbers INTEGER[] NOT NULL,
  reason TEXT,
  blocked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.blocked_trays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All can view blocked trays"
  ON public.blocked_trays FOR SELECT
  USING (true);

-- Add notification logs table
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  content TEXT,
  status TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notification logs"
  ON public.notification_logs FOR SELECT
  TO authenticated
  USING (true);

-- Update bookings table with new fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS delivery_method TEXT CHECK (delivery_method IN ('self_delivery', 'third_party', 'not_sure')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  ADD COLUMN IF NOT EXISTS applied_credit_amount NUMERIC(10,2) DEFAULT 0;

-- Update profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT TRUE;