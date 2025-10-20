import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { calculateDehydrationCost, calculateTotalCost } from '@/lib/utils/bookingUtils';
import { PACKING_COST_PER_PACKET } from '@/lib/constants';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/utils/dateUtils';
import { CancellationPolicyDialog } from './CancellationPolicyDialog';
import { PaymentConfirmationScreen } from './PaymentConfirmationScreen';
import { DeliveryMethodDialog } from './DeliveryMethodDialog';

interface PackingCostsProps {
  totalTrays: number;
  numPackets: number;
  dishes: { name: string; quantity: number }[];
  selectedDate: Date | null;
  allocatedTrays: number[];
  onBack: () => void;
}

export const PackingCosts = ({
  totalTrays,
  numPackets,
  dishes,
  selectedDate,
  allocatedTrays,
  onBack,
}: PackingCostsProps) => {
  const { user } = useAuth();
  const [availableCredit, setAvailableCredit] = useState(0);
  const [appliedCredit, setAppliedCredit] = useState(0);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const dehydrationCost = calculateDehydrationCost(totalTrays);
  const packingCost = numPackets * PACKING_COST_PER_PACKET;
  const totalCost = dehydrationCost + packingCost - appliedCredit;

  useEffect(() => {
    if (user) {
      fetchAvailableCredit();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();
    setProfile(data);
  };

  const fetchAvailableCredit = async () => {
    const { data } = await supabase
      .from('cancellation_credits')
      .select('*')
      .eq('user_id', user?.id)
      .eq('used', false)
      .gte('expiry_date', new Date().toISOString().split('T')[0]);

    if (data && data.length > 0) {
      const total = data.reduce((sum, credit) => sum + Number(credit.credit_amount), 0);
      setAvailableCredit(total);
    }
  };

  const handleApplyCredit = () => {
    const maxApplicable = Math.min(availableCredit, dehydrationCost + packingCost);
    setAppliedCredit(maxApplicable);
    toast.success(`Applied ₹${maxApplicable} credit`);
  };

  const handlePaymentClick = () => {
    if (!user || !selectedDate) {
      toast.error('Missing required information');
      return;
    }
    setShowCancellationDialog(true);
  };

  const handleCancellationAccept = async () => {
    setShowCancellationDialog(false);
    await processBooking();
  };

  const processBooking = async () => {
    if (!user || !selectedDate) return;

    try {
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
          total_cost: dehydrationCost + packingCost,
          applied_credit_amount: appliedCredit,
          tray_numbers: allocatedTrays,
          payment_status: profile?.payment_required === false ? 'completed' : 'pending',
          status: 'active',
        })
        .select()
        .single();

      if (bookingError) {
        toast.error('Failed to create booking');
        console.error(bookingError);
        return;
      }

      // Mark used credits
      if (appliedCredit > 0) {
        const { data: credits } = await supabase
          .from('cancellation_credits')
          .select('*')
          .eq('user_id', user.id)
          .eq('used', false)
          .gte('expiry_date', new Date().toISOString().split('T')[0])
          .order('expiry_date', { ascending: true });

        let remainingCredit = appliedCredit;
        for (const credit of credits || []) {
          if (remainingCredit <= 0) break;
          const useAmount = Math.min(remainingCredit, Number(credit.credit_amount));
          await supabase
            .from('cancellation_credits')
            .update({ used: true, used_in_booking_id: booking.id })
            .eq('id', credit.id);
          remainingCredit -= useAmount;
        }
      }

      // If payment not required, skip Razorpay
      if (profile?.payment_required === false) {
        setCompletedBooking(booking);
        setShowPaymentConfirmation(true);
        
        setTimeout(() => {
          setShowPaymentConfirmation(false);
          setShowDeliveryDialog(true);
        }, 3000);
        
        await sendToGoogleSheets(booking, 0);
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
          amount: Math.round(Math.max(0, totalCost) * 100),
          currency: 'INR',
          name: 'HUKI Food Dehydration',
          description: 'Tray Booking Payment',
          handler: async (response: any) => {
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

            setCompletedBooking(booking);
            toast.success('Your order is now under processing. Chill, relax and wait—your trays are reserved!');
            
            setShowPaymentConfirmation(true);
            
            setTimeout(() => {
              setShowPaymentConfirmation(false);
              setShowDeliveryDialog(true);
            }, 3000);
            
            await sendToGoogleSheets(booking, dehydrationCost + packingCost);
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

  const sendToGoogleSheets = async (booking: any, amountPaid: number) => {
    try {
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
          booking_date: formatDate(selectedDate!),
          order_id: booking.id,
          amount_paid: amountPaid,
          delivery_method: booking.delivery_method || 'not_set',
          payment_required: profile?.payment_required !== false,
          applied_credit: appliedCredit,
          status: 'active',
        }),
      });
    } catch (err) {
      console.error('Failed to send to Google Sheets:', err);
    }
  };

  const handleDeliveryConfirm = async (method: string) => {
    if (completedBooking) {
      await supabase
        .from('bookings')
        .update({ delivery_method: method })
        .eq('id', completedBooking.id);
      
      setShowDeliveryDialog(false);
      setTimeout(() => {
        window.location.href = '/profile';
      }, 500);
    }
  };

  return (
    <>
      <div className="bg-card p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-foreground mb-6">Packing & Payment</h2>

        {availableCredit > 0 && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="text-sm font-medium text-foreground">Available Credit</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{availableCredit}</p>
              </div>
              {appliedCredit === 0 && (
                <Button
                  onClick={handleApplyCredit}
                  size="sm"
                  variant="outline"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  Apply Credit
                </Button>
              )}
            </div>
            {appliedCredit > 0 && (
              <Badge className="bg-green-500 text-white">₹{appliedCredit} applied</Badge>
            )}
          </div>
        )}

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
              {appliedCredit > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Credit Applied:</span>
                  <span className="font-semibold">-₹{appliedCredit}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between text-lg">
                <span className="font-bold text-foreground">Total:</span>
                <span className="font-bold text-primary">₹{Math.max(0, totalCost)}</span>
              </div>
            </div>
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
            onClick={handlePaymentClick}
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {profile?.payment_required === false ? 'Confirm Booking' : `Confirm & Pay ₹${Math.max(0, totalCost)}`}
          </Button>
        </div>
      </div>

      <CancellationPolicyDialog
        open={showCancellationDialog}
        onAccept={handleCancellationAccept}
        totalCost={dehydrationCost + packingCost}
      />

      {completedBooking && (
        <PaymentConfirmationScreen
          open={showPaymentConfirmation}
          onClose={() => setShowPaymentConfirmation(false)}
          amountPaid={dehydrationCost + packingCost}
          totalTrays={totalTrays}
          numVarieties={dishes.length}
          numPackets={numPackets}
          orderId={completedBooking.id}
        />
      )}

      <DeliveryMethodDialog
        open={showDeliveryDialog}
        onConfirm={handleDeliveryConfirm}
      />
    </>
  );
};
