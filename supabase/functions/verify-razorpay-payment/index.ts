import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      bookingId 
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      throw new Error('Missing required payment verification parameters');
    }

    // Verify signature
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    const expectedSignature = createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      
      // Mark payment as failed
      await supabaseClient
        .from('bookings')
        .update({ payment_status: 'failed' })
        .eq('id', bookingId);

      throw new Error('Invalid payment signature');
    }

    // Fetch the booking to verify ownership
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError);
      throw new Error('Booking not found or unauthorized');
    }

    // Verify the order ID matches
    if (booking.razorpay_order_id !== razorpay_order_id) {
      console.error('Order ID mismatch');
      throw new Error('Order ID mismatch');
    }

    // Update booking with payment details
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        payment_status: 'completed',
        razorpay_payment_id: razorpay_payment_id,
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Failed to update booking:', updateError);
      throw new Error('Failed to update booking status');
    }

    console.log(`Payment verified successfully for booking ${bookingId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        bookingId,
        message: 'Payment verified successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-razorpay-payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});