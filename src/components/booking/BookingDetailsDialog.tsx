import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface BookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
}

export const BookingDetailsDialog = ({
  open,
  onOpenChange,
  booking,
}: BookingDetailsDialogProps) => {
  if (!booking) return null;

  const dishes = Array.isArray(booking.dishes) ? booking.dishes : [];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Booking Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Booking Date */}
          <div className="p-4 bg-accent/30 rounded-md">
            <p className="text-sm text-muted-foreground">Booking Date</p>
            <p className="text-lg font-semibold text-foreground">
              {new Date(booking.booking_date).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Status */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge
              className={
                booking.status === 'cancelled'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : booking.payment_status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : booking.payment_status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }
            >
              {booking.status === 'cancelled' ? 'Cancelled' : booking.payment_status}
            </Badge>
          </div>

          {/* Dishes */}
          <div>
            <h3 className="font-semibold text-foreground mb-2">Dishes</h3>
            <div className="space-y-2">
              {dishes.map((dish: any, index: number) => (
                <div key={index} className="flex justify-between p-3 bg-accent/20 rounded-md">
                  <span className="text-foreground">{dish.name}</span>
                  <span className="text-muted-foreground">{dish.quantity} tray{dish.quantity > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trays */}
          <div>
            <h3 className="font-semibold text-foreground mb-2">Allocated Trays</h3>
            <p className="text-foreground">
              {booking.tray_numbers && booking.tray_numbers.length > 0
                ? booking.tray_numbers.join(', ')
                : 'Not assigned'}
            </p>
          </div>

          {/* Cost Breakdown */}
          <div className="border-t border-border pt-4 space-y-2">
            <h3 className="font-semibold text-foreground mb-2">Cost Breakdown</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Trays:</span>
                <span className="text-foreground">{booking.total_trays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dehydration Cost:</span>
                <span className="text-foreground">₹{booking.dehydration_cost}</span>
              </div>
              {booking.packing_cost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Packing Cost:</span>
                  <span className="text-foreground">₹{booking.packing_cost}</span>
                </div>
              )}
              {booking.applied_credit_amount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Credit Applied:</span>
                  <span>-₹{booking.applied_credit_amount}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                <span className="text-foreground">Total Cost:</span>
                <span className="text-foreground">₹{booking.total_cost}</span>
              </div>
            </div>
          </div>

          {/* Freeze-Dried Paneer */}
          {booking.freeze_dried_orders && booking.freeze_dried_orders.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Freeze-Dried Paneer Order</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Packets:</span>
                  <span className="text-foreground">{booking.freeze_dried_orders[0].total_packets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grams per Packet:</span>
                  <span className="text-foreground">{booking.freeze_dried_orders[0].grams_per_packet}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="text-foreground">₹{booking.freeze_dried_orders[0].total_cost}</span>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Method */}
          {booking.delivery_method && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Delivery Method</h3>
              <p className="text-foreground capitalize">
                {booking.delivery_method.replace('_', ' ')}
              </p>
            </div>
          )}

          {/* Payment IDs */}
          {booking.razorpay_order_id && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Order ID: {booking.razorpay_order_id}</p>
              {booking.razorpay_payment_id && (
                <p>Payment ID: {booking.razorpay_payment_id}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
