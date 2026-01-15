-- ===== CREATE SECURE RPC FUNCTION FOR TRAY AVAILABILITY =====
-- This function returns ONLY tray numbers for a given date
-- It does NOT expose any customer personal information (name, whatsapp, user_id, etc.)

CREATE OR REPLACE FUNCTION public.get_booked_trays_for_date(target_date date)
RETURNS integer[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(unnested_tray),
    ARRAY[]::integer[]
  )
  FROM (
    SELECT unnest(tray_numbers) as unnested_tray
    FROM public.bookings
    WHERE booking_date = target_date
      AND payment_status = 'completed'
      AND status = 'active'
  ) as trays;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_booked_trays_for_date(date) TO authenticated;

-- Add comment explaining the security purpose
COMMENT ON FUNCTION public.get_booked_trays_for_date(date) IS 
  'Securely returns only tray numbers for a date. Does NOT expose customer PII (name, whatsapp, user_id). Used for tray availability checking without data leakage.';