import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface BookingDetailsDialogProps {
  booking: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminBookingDetailsDialog = ({ booking, open, onOpenChange }: BookingDetailsDialogProps) => {
  if (!booking) return null;

  const totalPackets =
    (booking.num_packets || 0) +
    (Array.isArray(booking.vacuum_packing) ? booking.vacuum_packing.length : 0) +
    (booking.freeze_dried_orders?.[0]?.total_packets || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{booking.profile?.full_name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order ID</p>
                  <p className="font-mono text-xs">{booking.id.substring(0, 8)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{booking.profile?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{booking.profile?.mobile_number || '-'}</p>
                </div>
              </div>
            </div>

            {/* Booking Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Booking Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Booking Date</p>
                  <p className="font-medium">
                    {format(new Date(booking.booking_date), 'MMMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Trays</p>
                  <p className="font-medium">{booking.total_trays}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tray Numbers</p>
                  <p className="font-medium text-xs">{booking.tray_numbers?.join(', ') || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Packets</p>
                  <p className="font-medium">{totalPackets}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                    {booking.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Booking Type</p>
                  <Badge variant={booking.admin_created ? 'default' : 'secondary'}>
                    {booking.admin_created ? 'Admin Created' : 'Customer Booking'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Dishes Information */}
            {booking.dishes && Array.isArray(booking.dishes) && booking.dishes.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Dishes Ordered</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-semibold">Dish Name</th>
                        <th className="text-center p-3 font-semibold">Trays</th>
                        <th className="text-center p-3 font-semibold">Packets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booking.dishes.map((dish: any, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="p-3 font-medium">{dish.name}</td>
                          <td className="p-3 text-center">{dish.quantity}</td>
                          <td className="p-3 text-center">{dish.packets || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Vacuum Packing */}
            {booking.vacuum_packing && Array.isArray(booking.vacuum_packing) && booking.vacuum_packing.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Vacuum Packing</h3>
                <div className="space-y-2">
                  {booking.vacuum_packing.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div>
                        <p className="font-medium">{item.dish_name}</p>
                        <p className="text-sm text-muted-foreground">Vacuum sealed</p>
                      </div>
                      <p className="text-sm font-medium">₹{item.cost}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Freeze Dried Paneer */}
            {booking.freeze_dried_orders && Array.isArray(booking.freeze_dried_orders) && booking.freeze_dried_orders.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Freeze-Dried Paneer</h3>
                {booking.freeze_dried_orders.map((order: any, idx: number) => (
                  <div key={idx} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Grams per packet</span>
                      <span className="font-medium">{order.grams_per_packet}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total packets</span>
                      <span className="font-medium">{order.total_packets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Cost</span>
                      <span className="font-medium">₹{order.total_cost}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <Badge variant="outline">
                    {booking.payment_method === 'online' ? 'Online' : booking.payment_method === 'request_only' ? 'Request' : 'COD'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Status</p>
                  <Badge variant={booking.payment_status === 'completed' ? 'default' : 'destructive'}>
                    {booking.payment_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Delivery Method</p>
                  <p className="font-medium">{booking.delivery_method?.replace('_', ' ') || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Cost</p>
                  <p className="font-bold text-lg">₹{Number(booking.total_cost).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
