import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateDehydrationCost, calculateTotalCost } from '@/lib/utils/bookingUtils';
import { PACKING_COST_PER_PACKET } from '@/lib/constants';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/utils/dateUtils';

interface PackingCostsProps {
  totalTrays: number;
  numPackets: number;
  setNumPackets: (n: number) => void;
  dishes: { name: string; quantity: number }[];
  selectedDate: Date | null;
  allocatedTrays: number[];
  onBack: () => void;
}

export const PackingCosts = ({
  totalTrays,
  numPackets,
  setNumPackets,
  dishes,
  selectedDate,
  allocatedTrays,
  onBack,
}: PackingCostsProps) => {
  const { user } = useAuth();
  const dehydrationCost = calculateDehydrationCost(totalTrays);
  const packingCost = numPackets * PACKING_COST_PER_PACKET;
  const totalCost = dehydrationCost + packingCost;

  const handlePayment = async () => {
    if (!user || !selectedDate) {
      toast.error('Missing required information');
      return;
    }

    try {
      // Create booking in database
      const dishesObj = dishes.reduce((acc, dish) => {
        acc[dish.name] = dish.quantity;
        return acc;
      }, {} as Record<string, number>);

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          booking_date: formatDate(selectedDate),
          dishes: dishesObj,
          total_trays: totalTrays,
          num_packets: numPackets,
          dehydration_cost: dehydrationCost,
          packing_cost: packingCost,
          total_cost: totalCost,
          tray_numbers: allocatedTrays,
          payment_status: 'pending',
        })
        .select()
        .single();

      if (bookingError) {
        toast.error('Failed to create booking');
        console.error(bookingError);
        return;
      }

      // Load Razorpay
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_Lv3CpJZCusi5KP',
          amount: Math.round(totalCost * 100),
          currency: 'INR',
          name: 'HUKI Food Dehydration',
          description: 'Tray Booking Payment',
          handler: async (response: any) => {
            // Update booking with payment details
            const { error: updateError } = await supabase
              .from('bookings')
              .update({
                payment_status: 'completed',
                razorpay_payment_id: response.razorpay_payment_id,
              })
              .eq('id', booking.id);

            if (updateError) {
              toast.error('Payment successful but failed to update booking');
              return;
            }

            toast.success('Your order is now under processing. Chill, relax and wait—your trays are reserved!');
            
            // Send to Google Sheets
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

              await fetch('https://script.google.com/macros/s/AKfycbwOoJxNo1_HFzVI2lU6oKpMHi3Gq06j6_nmwdj9bg0FhlztnB_VwB16J6AOTU3Ql6PK-A/exec', {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  customer_name: profile?.full_name,
                  customer_email: profile?.email,
                  trays_booked: totalTrays,
                  contact_number: profile?.mobile_number,
                  booking_date: formatDate(selectedDate),
                  order_id: booking.id,
                  amount_paid: totalCost,
                }),
              });
            } catch (err) {
              console.error('Failed to send to Google Sheets:', err);
            }

            setTimeout(() => {
              window.location.href = '/profile';
            }, 2000);
          },
          prefill: {
            email: user.email,
          },
          theme: {
            color: '#DC2626',
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();

        razorpay.on('payment.failed', async () => {
          await supabase
            .from('bookings')
            .update({ payment_status: 'failed' })
            .eq('id', booking.id);
          
          toast.error('Payment failed. Please try again.');
        });
      };
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment');
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-foreground mb-6">Packing & Payment</h2>

      <div className="mb-6 space-y-4">
        <div className="p-4 bg-accent/30 rounded-md">
          <h3 className="font-semibold text-foreground mb-2">Cost Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground">Dehydration Cost ({totalTrays} trays):</span>
              <span className="font-semibold text-foreground">₹{dehydrationCost}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">Packing Cost ({numPackets} packets):</span>
              <span className="font-semibold text-foreground">₹{packingCost}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-lg">
              <span className="font-bold text-foreground">Total:</span>
              <span className="font-bold text-primary">₹{totalCost}</span>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="packets">Number of Packets for Packing</Label>
          <Input
            id="packets"
            type="number"
            min="0"
            value={numPackets}
            onChange={(e) => setNumPackets(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Packing cost: ₹{PACKING_COST_PER_PACKET} per packet
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handlePayment}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Confirm & Pay ₹{totalCost}
        </Button>
      </div>
    </div>
  );
};
