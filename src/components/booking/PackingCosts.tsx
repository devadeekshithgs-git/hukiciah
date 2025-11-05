import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateDehydrationCost } from '@/lib/utils/bookingUtils';
import { PACKING_COST_PER_PACKET, VACUUM_PACKING_PRICE, VACUUM_PACKING_PRICE_BULK, VACUUM_PACKING_BULK_THRESHOLD, FREEZE_DRIED_PANEER_PRICE_PER_GRAM } from '@/lib/constants';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/utils/dateUtils';
import { CancellationPolicyDialog } from './CancellationPolicyDialog';
import { PaymentConfirmationScreen } from './PaymentConfirmationScreen';
import { DeliveryMethodDialog } from './DeliveryMethodDialog';
import { z } from 'zod';

// Booking validation schema
const bookingSchema = z.object({
  dishes: z.array(z.object({
    name: z.string().min(1).max(100),
    quantity: z.number().int().min(1).max(100),
  })).min(1).max(20),
  total_trays: z.number().int().min(1).max(50),
  tray_numbers: z.array(z.number().int().min(1).max(50)).min(1).max(50),
  num_packets: z.number().int().min(0).max(500),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

interface PackingCostsProps {
  totalTrays: number;
  numPackets: number;
  dishes: { name: string; quantity: number; packets?: number; vacuumPacking?: { enabled: boolean; packets: number } }[];
  selectedDate: Date | null;
  allocatedTrays: number[];
  freezeDriedPaneer: { enabled: boolean; packets: number; gramsPerPacket: number };
  onBack: () => void;
}

export const PackingCosts = ({
  totalTrays,
  numPackets,
  dishes,
  selectedDate,
  allocatedTrays,
  freezeDriedPaneer,
  onBack,
}: PackingCostsProps) => {
  const { user } = useAuth();
  const [availableCredit, setAvailableCredit] = useState(0);
  const [appliedCredit, setAppliedCredit] = useState(0);
  const paymentMethod = 'online'; // Only Razorpay online payment supported
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<string>('');
  const [completedBooking, setCompletedBooking] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Calculate vacuum packing cost
  const calculateVacuumPackingCost = (): number => {
    let totalCost = 0;
    dishes.forEach(dish => {
      if (dish.vacuumPacking?.enabled && dish.vacuumPacking.packets > 0) {
        const price = dish.vacuumPacking.packets > VACUUM_PACKING_BULK_THRESHOLD 
          ? VACUUM_PACKING_PRICE_BULK 
          : VACUUM_PACKING_PRICE;
        totalCost += dish.vacuumPacking.packets * price;
      }
    });
    return totalCost;
  };

  // Calculate freeze-dried paneer cost
  const calculateFreezeDriedCost = (): number => {
    if (!freezeDriedPaneer.enabled || freezeDriedPaneer.gramsPerPacket < 10) {
      return 0;
    }
    return freezeDriedPaneer.packets * freezeDriedPaneer.gramsPerPacket * FREEZE_DRIED_PANEER_PRICE_PER_GRAM;
  };

  const dehydrationCost = calculateDehydrationCost(totalTrays);
  const packingCost = numPackets * PACKING_COST_PER_PACKET;
  const vacuumPackingCost = calculateVacuumPackingCost();
  const freezeDriedCost = calculateFreezeDriedCost();
  const subtotal = dehydrationCost + packingCost + vacuumPackingCost + freezeDriedCost;
  const totalCost = subtotal - appliedCredit;

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
    const maxApplicable = Math.min(availableCredit, subtotal);
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

  const handleCancellationAccept = () => {
    setShowCancellationDialog(false);
    setShowDeliveryDialog(true);
  };

  const handleDeliveryConfirm = async (method: string) => {
    setDeliveryMethod(method);
    setShowDeliveryDialog(false);
    await processBooking(method);
  };

  const processBooking = async (selectedDeliveryMethod: string) => {
    if (!user || !selectedDate) return;

    try {
      // Validate booking data
      try {
        bookingSchema.parse({
          dishes: dishes.map(d => ({ name: d.name, quantity: d.quantity })),
          total_trays: totalTrays,
          tray_numbers: allocatedTrays,
          num_packets: numPackets,
          booking_date: formatDate(selectedDate),
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          toast.error('Invalid booking data: ' + validationError.errors[0].message);
          return;
        }
      }

      // Store dishes as array of objects with name, quantity, and packets
      const dishesArray = dishes.map(dish => ({
        name: dish.name,
        quantity: dish.quantity,
        packets: dish.packets || 0
      }));

      // Prepare vacuum packing data
      const vacuumPackingData = dishes
        .filter(dish => dish.vacuumPacking?.enabled)
        .map(dish => ({
          dish: dish.name,
          packets: dish.vacuumPacking!.packets,
          cost_per_packet: dish.vacuumPacking!.packets > VACUUM_PACKING_BULK_THRESHOLD 
            ? VACUUM_PACKING_PRICE_BULK 
            : VACUUM_PACKING_PRICE,
        }));

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          booking_date: formatDate(selectedDate),
          dishes: dishesArray,
          total_trays: totalTrays,
          num_packets: numPackets,
          dehydration_cost: dehydrationCost,
          packing_cost: packingCost + vacuumPackingCost,
          total_cost: subtotal,
          applied_credit_amount: appliedCredit,
          tray_numbers: allocatedTrays,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'online' && profile?.payment_required !== false ? 'pending' : 'completed',
          status: 'active',
          vacuum_packing: vacuumPackingData,
          delivery_method: selectedDeliveryMethod,
        })
        .select()
        .single();

      if (bookingError) {
        if (import.meta.env.DEV) {
          console.error('Booking creation error:', bookingError);
        }
        toast.error('Failed to create booking');
        return;
      }

      // Create freeze-dried paneer order if enabled
      if (freezeDriedPaneer.enabled && freezeDriedPaneer.gramsPerPacket >= 10) {
        const { error: paneerError } = await supabase
          .from('freeze_dried_orders')
          .insert({
            booking_id: booking.id,
            product_type: 'paneer',
            total_packets: freezeDriedPaneer.packets,
            grams_per_packet: freezeDriedPaneer.gramsPerPacket,
            unit_price_per_gram: FREEZE_DRIED_PANEER_PRICE_PER_GRAM,
            total_cost: freezeDriedCost,
          });

        if (paneerError) {
          if (import.meta.env.DEV) {
            console.error('Failed to create freeze-dried order:', paneerError);
          }
          toast.error('Failed to add freeze-dried paneer');
        }
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

      // If payment not required, complete booking
      if (profile?.payment_required === false) {
        setCompletedBooking(booking);
        setShowPaymentConfirmation(true);
        
        toast.success('Booking completed successfully!');
        
        setTimeout(() => {
          setShowPaymentConfirmation(false);
          window.location.href = '/profile';
        }, 3000);
        
        await sendToGoogleSheets(booking, 0);
        return;
      }

      // Call secure edge function to create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: { bookingId: booking.id }
        }
      );

      if (orderError || !orderData?.success) {
        if (import.meta.env.DEV) {
          console.error('Order creation error:', orderError);
        }
        toast.error('Failed to initiate payment');
        return;
      }

      // If no payment required (amount is 0 after credits)
      if (!orderData.requiresPayment) {
        setCompletedBooking(booking);
        toast.success('Booking completed successfully!');
        setShowPaymentConfirmation(true);
        
        setTimeout(() => {
          setShowPaymentConfirmation(false);
          window.location.href = '/profile';
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
          key: orderData.keyId,
          amount: Math.round(orderData.amount * 100),
          currency: orderData.currency,
          order_id: orderData.orderId,
          name: 'HUKI Food Dehydration',
          description: 'Tray Booking Payment',
          handler: async (response: any) => {
            // Verify payment on backend
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'verify-razorpay-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingId: booking.id,
                }
              }
            );

            if (verifyError || !verifyData?.success) {
              if (import.meta.env.DEV) {
                console.error('Payment verification failed:', verifyError);
              }
              toast.error('Payment verification failed. Please contact support.');
              return;
            }

            setCompletedBooking(booking);
            toast.success('Your order is now under processing. Chill, relax and wait—your trays are reserved!');
            
            setShowPaymentConfirmation(true);
            
            setTimeout(() => {
              setShowPaymentConfirmation(false);
              window.location.href = '/profile';
            }, 3000);
            
            await sendToGoogleSheets(booking, orderData.amount);
          },
          prefill: {
            email: user.email,
          },
          theme: {
            color: '#DC2626',
          },
          modal: {
            ondismiss: async () => {
              // User closed payment modal without completing
              await supabase
                .from('bookings')
                .update({ payment_status: 'failed' })
                .eq('id', booking.id);
            }
          }
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
      if (import.meta.env.DEV) {
        console.error('Payment error:', error);
      }
      toast.error('Failed to initiate payment');
    }
  };

  // Sanitize input for Google Sheets to prevent formula injection
  const sanitizeForSheets = (value: string): string => {
    if (!value) return '';
    return value
      .replace(/^[=+\-@]/g, "'")
      .substring(0, 255)
      .replace(/[\x00-\x1F\x7F]/g, '');
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
          customer_name: sanitizeForSheets(profile?.full_name || ''),
          customer_email: profile?.email,
          trays_booked: totalTrays,
          contact_number: profile?.mobile_number,
          booking_date: formatDate(selectedDate!),
          order_id: booking.id,
          amount_paid: amountPaid,
          delivery_method: booking.delivery_method || 'not_set',
          payment_required: profile?.payment_required !== false,
          applied_credit: appliedCredit,
          payment_method: paymentMethod,
          vacuum_packing_cost: vacuumPackingCost,
          freeze_dried_cost: freezeDriedCost,
          status: 'active',
        }),
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to send to Google Sheets:', err);
      }
      // Silently fail - don't block user flow
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
            <h3 className="font-semibold text-foreground mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between items-center">
                <span className="text-foreground">Total Trays: <strong>{totalTrays}</strong> | Packets: <strong>{numPackets}</strong></span>
              </div>
              {vacuumPackingCost > 0 && (
                <div className="text-xs text-muted-foreground p-2 bg-background/50 rounded border border-border">
                  <strong>Vacuum Packing:</strong> Special packaging for selected items
                </div>
              )}
              {freezeDriedCost > 0 && (
                <div className="text-xs text-muted-foreground p-2 bg-background/50 rounded border border-border">
                  <strong>Freeze-Dried Paneer:</strong> {freezeDriedPaneer.gramsPerPacket}g @ ₹2/g
                </div>
              )}
            </div>
            
            <h3 className="font-semibold text-foreground mb-2 mt-4">Cost Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground">Dehydration Cost ({totalTrays} trays):</span>
                <span className="font-semibold text-foreground">₹{dehydrationCost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground">Regular Packing ({numPackets} packets @ ₹10 each):</span>
                <span className="font-semibold text-foreground">₹{packingCost}</span>
              </div>
              {vacuumPackingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground">Vacuum Packing:</span>
                  <span className="font-semibold text-foreground">₹{vacuumPackingCost}</span>
                </div>
              )}
              {freezeDriedCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground">
                    Freeze-Dried Paneer ({freezeDriedPaneer.gramsPerPacket}g × ₹2/g):
                  </span>
                  <span className="font-semibold text-foreground">₹{freezeDriedCost.toLocaleString('en-IN')}</span>
                </div>
              )}
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
            Confirm & Pay ₹{Math.max(0, totalCost)}
          </Button>
        </div>
      </div>

      <CancellationPolicyDialog
        open={showCancellationDialog}
        onAccept={handleCancellationAccept}
        onClose={() => setShowCancellationDialog(false)}
        totalCost={subtotal}
      />

      {completedBooking && (
        <PaymentConfirmationScreen
          open={showPaymentConfirmation}
          onClose={() => setShowPaymentConfirmation(false)}
          amountPaid={subtotal}
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