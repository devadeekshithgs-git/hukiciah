import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingEmailRequest {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string;
  dishes: Array<{ name: string; grams: number }>;
  totalTrays: number;
  trayNumbers: number[];
  totalCost: number;
  paymentMethod: string;
  deliveryMethod: string;
  vacuumPacking?: { itemName: string; packets: number }[];
  freezeDriedPaneer?: { packets: number; gramsPerPacket: number; cost: number };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-booking-confirmation function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bookingData: BookingEmailRequest = await req.json();
    console.log("Received booking data:", JSON.stringify(bookingData, null, 2));

    // Format dishes for email
    const dishesHtml = bookingData.dishes
      .map((dish) => `<li>${dish.name}: ${dish.grams}g</li>`)
      .join("");

    // Format vacuum packing if present
    let vacuumPackingHtml = "";
    if (bookingData.vacuumPacking && bookingData.vacuumPacking.length > 0) {
      const vacuumItems = bookingData.vacuumPacking
        .map((item) => `<li>${item.itemName}: ${item.packets} packets</li>`)
        .join("");
      vacuumPackingHtml = `
        <h3 style="color: #333; margin-top: 20px;">Vacuum Packing:</h3>
        <ul>${vacuumItems}</ul>
      `;
    }

    // Format freeze-dried paneer if present
    let freezeDriedHtml = "";
    if (bookingData.freezeDriedPaneer && bookingData.freezeDriedPaneer.packets > 0) {
      freezeDriedHtml = `
        <h3 style="color: #333; margin-top: 20px;">Freeze-Dried Paneer:</h3>
        <ul>
          <li>Packets: ${bookingData.freezeDriedPaneer.packets}</li>
          <li>Grams per packet: ${bookingData.freezeDriedPaneer.gramsPerPacket}g</li>
          <li>Cost: ₹${bookingData.freezeDriedPaneer.cost}</li>
        </ul>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Booking Received - HUKI</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #e65100; text-align: center; margin-bottom: 30px;">🎉 New Booking Received!</h1>
            
            <div style="background-color: #fff3e0; border-left: 4px solid #e65100; padding: 15px; margin-bottom: 20px;">
              <h2 style="color: #e65100; margin: 0;">Booking Details</h2>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Customer Name:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${bookingData.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${bookingData.customerEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${bookingData.customerPhone}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Booking Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${bookingData.bookingDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Tray Numbers:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${bookingData.trayNumbers.join(", ")}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Total Trays:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${bookingData.totalTrays}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Payment Method:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${bookingData.paymentMethod}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Delivery Method:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${bookingData.deliveryMethod}</td>
              </tr>
              <tr style="background-color: #e8f5e9;">
                <td style="padding: 10px;"><strong>Total Cost:</strong></td>
                <td style="padding: 10px; font-size: 18px; color: #2e7d32;"><strong>₹${bookingData.totalCost}</strong></td>
              </tr>
            </table>
            
            <h3 style="color: #333;">Dishes:</h3>
            <ul style="background-color: #f9f9f9; padding: 15px 30px; border-radius: 5px;">
              ${dishesHtml}
            </ul>
            
            ${vacuumPackingHtml}
            ${freezeDriedHtml}
            
            <div style="margin-top: 30px; padding: 20px; background-color: #e3f2fd; border-radius: 5px; text-align: center;">
              <p style="margin: 0; color: #1565c0;">This is an automated notification from HUKI Booking System.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log("Sending email to huki.ciah@gmail.com");
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "HUKI Bookings <onboarding@resend.dev>",
        to: ["huki.ciah@gmail.com"],
        subject: `New Booking: ${bookingData.customerName} - ${bookingData.bookingDate}`,
        html: emailHtml,
      }),
    });
    
    const emailResult = await emailResponse.json();

    console.log("Email sent successfully:", emailResult);

    // Log the notification
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("notification_logs").insert({
      recipient: "huki.ciah@gmail.com",
      notification_type: "booking_confirmation",
      content: `Booking from ${bookingData.customerName} for ${bookingData.bookingDate}`,
      status: "sent",
    });

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-booking-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
