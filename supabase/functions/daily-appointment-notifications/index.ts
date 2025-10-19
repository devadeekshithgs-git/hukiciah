import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@huki.com';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Fetch all bookings for tomorrow
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles:user_id (full_name, email, mobile_number)
      `)
      .eq('booking_date', tomorrowStr)
      .eq('payment_status', 'completed')
      .eq('status', 'active');

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    if (!bookings || bookings.length === 0) {
      console.log('No bookings for tomorrow');
      return new Response(
        JSON.stringify({ message: 'No bookings for tomorrow' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Format appointment list
    let emailContent = `
      <h2>HUKI - Appointment List for ${tomorrow.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
      <p>Total Bookings: ${bookings.length}</p>
      <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th>Customer Name</th>
            <th>Mobile</th>
            <th>Email</th>
            <th>Trays</th>
            <th>Delivery Method</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
    `;

    bookings.forEach((booking: any) => {
      const profile = booking.profiles;
      emailContent += `
        <tr>
          <td>${profile?.full_name || 'N/A'}</td>
          <td>${profile?.mobile_number || 'N/A'}</td>
          <td>${profile?.email || 'N/A'}</td>
          <td>${booking.total_trays} (${booking.tray_numbers.join(', ')})</td>
          <td>${booking.delivery_method ? booking.delivery_method.replace('_', ' ') : 'Not set'}</td>
          <td>${booking.id.slice(0, 8)}</td>
        </tr>
      `;
    });

    emailContent += `
        </tbody>
      </table>
      <br>
      <p><strong>Note:</strong> Consider calling first-time customers for confirmation.</p>
    `;

    // Log notification
    const { error: logError } = await supabase
      .from('notification_logs')
      .insert({
        notification_type: 'daily_appointment_list',
        recipient: adminEmail,
        content: `Sent appointment list for ${tomorrowStr}`,
        status: 'sent',
      });

    if (logError) {
      console.error('Error logging notification:', logError);
    }

    console.log('Appointment list prepared:', emailContent);

    return new Response(
      JSON.stringify({ 
        message: 'Appointment list prepared successfully',
        bookings_count: bookings.length,
        date: tomorrowStr,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in daily-appointment-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
