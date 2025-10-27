import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const { bookingId } = await req.json();

    if (!bookingId) {
      throw new Error('Missing bookingId');
    }

    // Fetch the booking to verify ownership and get the amount
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

    // Verify booking is in pending state
    if (booking.payment_status !== 'pending') {
      throw new Error('Booking payment already processed');
    }

    // Calculate amount to charge (total_cost - applied_credit_amount)
    const amountToCharge = Math.max(0, Number(booking.total_cost) - Number(booking.applied_credit_amount || 0));

    // If amount is 0, mark as completed without Razorpay
    if (amountToCharge === 0) {
      const { error: updateError } = await supabaseClient
        .from('bookings')
        .update({ payment_status: 'completed' })
        .eq('id', bookingId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error('Failed to update booking');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          requiresPayment: false,
          bookingId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Razorpay order
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
      body: JSON.stringify({
        amount: Math.round(amountToCharge * 100), // Convert to paise
        currency: 'INR',
        receipt: bookingId,
        notes: {
          booking_id: bookingId,
          user_id: user.id,
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Razorpay order creation failed:', errorText);
      throw new Error('Failed to create Razorpay order');
    }

    const order = await orderResponse.json();

    // Store order ID in booking
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({ razorpay_order_id: order.id })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Failed to update booking with order ID:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        requiresPayment: true,
        orderId: order.id,
        amount: amountToCharge,
        currency: 'INR',
        keyId: razorpayKeyId,
        bookingId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-razorpay-order:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});