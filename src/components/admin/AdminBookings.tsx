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

      // Fetch profile data for each booking
      const bookingsWithProfiles = await Promise.all(
        data.map(async (booking) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, mobile_number')
            .eq('id', booking.user_id)
            .single();
          
          return { ...booking, profile };
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
                <TableHead>Status</TableHead>
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
                    <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                      {booking.status}
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
