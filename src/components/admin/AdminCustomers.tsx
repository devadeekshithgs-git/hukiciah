import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AdminBookingDetailsDialog } from './BookingDetailsDialog';
import { useToast } from '@/hooks/use-toast';
import { Search, User } from 'lucide-react';

export const AdminCustomers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load customers',
        variant: 'destructive',
      });
    }
  };

  const fetchCustomerBookings = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profile:profiles(full_name, email, mobile_number),
          freeze_dried_orders(*)
        `)
        .eq('user_id', customerId)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setCustomerBookings(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load customer bookings',
        variant: 'destructive',
      });
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    fetchCustomerBookings(customer.id);
  };

  const handleBookingClick = (booking: any) => {
    setSelectedBooking(booking);
    setDetailsDialogOpen(true);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile_number?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Customer Search & List */}
            <div className="md:col-span-1 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[600px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedCustomer?.id === customer.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{customer.full_name}</p>
                          <p className="text-sm opacity-90 truncate">{customer.email}</p>
                          <p className="text-sm opacity-90">{customer.mobile_number}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Customer Bookings */}
            <div className="md:col-span-2">
              {selectedCustomer ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">{selectedCustomer.full_name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Email: </span>
                        <span className="font-medium">{selectedCustomer.email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone: </span>
                        <span className="font-medium">{selectedCustomer.mobile_number}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg">
                    <div className="p-4 border-b bg-muted">
                      <h4 className="font-semibold">Order History ({customerBookings.length})</h4>
                    </div>
                    <ScrollArea className="h-[500px]">
                      <div className="divide-y">
                        {customerBookings.length > 0 ? (
                          customerBookings.map((booking) => (
                            <div
                              key={booking.id}
                              onClick={() => handleBookingClick(booking)}
                              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-semibold">
                                    {format(new Date(booking.booking_date), 'MMMM dd, yyyy')}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Order ID: {booking.id.substring(0, 8)}
                                  </p>
                                </div>
                                <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                                  {booking.status}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                <div>
                                  <span className="text-muted-foreground">Trays: </span>
                                  <span className="font-medium">{booking.total_trays}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total: </span>
                                  <span className="font-medium">₹{booking.total_cost}</span>
                                </div>
                              </div>

                              {booking.dishes && booking.dishes.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase">Dishes:</p>
                                  {booking.dishes.map((dish: any, idx: number) => (
                                    <div key={idx} className="text-sm flex justify-between">
                                      <span>{dish.name}</span>
                                      <span className="text-muted-foreground">
                                        {dish.quantity} tray{dish.quantity > 1 ? 's' : ''}, {dish.packets} packets
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-muted-foreground">
                            No bookings found for this customer
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                  Select a customer to view their orders
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminBookingDetailsDialog
        booking={selectedBooking}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
};
