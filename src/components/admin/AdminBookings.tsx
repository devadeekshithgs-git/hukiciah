import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

const AdminBookings = () => {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile data and freeze-dried orders for each booking
      const bookingsWithProfiles = await Promise.all(
        data.map(async (booking) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, mobile_number')
            .eq('id', booking.user_id)
            .single();
          
          const { data: freezeDried } = await supabase
            .from('freeze_dried_orders')
            .select('*')
            .eq('booking_id', booking.id);
          
          return { ...booking, profile, freeze_dried_orders: freezeDried || [] };
        })
      );

      return bookingsWithProfiles;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Trays</TableHead>
                <TableHead>Tray Numbers</TableHead>
                <TableHead>Extras</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings?.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{format(new Date(booking.booking_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{booking.profile?.full_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{booking.profile?.email}</div>
                      <div className="text-muted-foreground">{booking.profile?.mobile_number}</div>
                    </div>
                  </TableCell>
                  <TableCell>{booking.total_trays}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {booking.tray_numbers?.join(', ')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      {booking.vacuum_packing && Array.isArray(booking.vacuum_packing) && (booking.vacuum_packing as any[]).length > 0 && (
                        <div className="text-blue-600">
                          🔵 Vacuum: {(booking.vacuum_packing as any[]).length} items
                        </div>
                      )}
                      {booking.freeze_dried_orders && Array.isArray(booking.freeze_dried_orders) && booking.freeze_dried_orders.length > 0 && (
                        <div className="text-purple-600">
                          ❄️ Paneer: {(booking.freeze_dried_orders[0] as any).total_packets}×{(booking.freeze_dried_orders[0] as any).grams_per_packet}g
                        </div>
                      )}
                      {(!booking.vacuum_packing || !Array.isArray(booking.vacuum_packing) || (booking.vacuum_packing as any[]).length === 0) && 
                       (!booking.freeze_dried_orders || !Array.isArray(booking.freeze_dried_orders) || booking.freeze_dried_orders.length === 0) && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={
                        booking.payment_method === 'online' 
                          ? 'border-green-500 text-green-600' 
                          : booking.payment_method === 'request_only'
                          ? 'border-yellow-500 text-yellow-600'
                          : 'border-blue-500 text-blue-600'
                      }
                    >
                      {booking.payment_method === 'online' 
                        ? 'Online' 
                        : booking.payment_method === 'request_only'
                        ? 'Request'
                        : 'COD'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={booking.payment_status === 'completed' ? 'default' : 'destructive'}>
                      {booking.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{Number(booking.total_cost).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminBookings;
