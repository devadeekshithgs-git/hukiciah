import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { AdminBookingDetailsDialog } from './BookingDetailsDialog';
import { useToast } from '@/hooks/use-toast';
import { Search, User, ShoppingBag, Package, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast as sonnerToast } from 'sonner';

export const AdminCustomers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        .select('*, freeze_dried_orders(*)')
        .eq('user_id', customerId)
        .eq('payment_status', 'completed')
        .order('booking_date', { ascending: false });

      if (error) {
        console.error('Error fetching customer bookings:', error);
        throw error;
      }
      setCustomerBookings(data || []);
    } catch (error: any) {
      console.error('Customer bookings error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load customer bookings',
        variant: 'destructive',
      });
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    fetchCustomerBookings(customer.id);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      sonnerToast.success('Booking deleted successfully');
      setDeletingBookingId(null);
      if (selectedCustomer) {
        fetchCustomerBookings(selectedCustomer.id);
      }
    },
    onError: (error: any) => {
      sonnerToast.error('Failed to delete booking: ' + error.message);
    },
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingBookingId(id);
  };

  const confirmDelete = () => {
    if (deletingBookingId) {
      deleteMutation.mutate(deletingBookingId);
    }
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

                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="summary" className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        Order Summary
                      </TabsTrigger>
                      <TabsTrigger value="details" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Detailed View
                      </TabsTrigger>
                    </TabsList>

                    {/* Summary Tab */}
                    <TabsContent value="summary" className="mt-4">
                      <div className="border rounded-lg">
                        <div className="p-4 border-b bg-muted">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Order History ({customerBookings.length})</h4>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Total Spent: </span>
                              <span className="font-bold text-lg">
                                ₹{customerBookings.reduce((sum, b) => sum + Number(b.total_cost || 0), 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
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
                                    <Badge variant={booking.payment_status === 'completed' ? 'default' : 'secondary'}>
                                      {booking.payment_status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Trays: </span>
                                      <span className="font-medium">{booking.total_trays}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Packets: </span>
                                      <span className="font-medium">{booking.num_packets}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Amount Paid: </span>
                                      <span className="font-medium text-green-600">₹{booking.total_cost}</span>
                                    </div>
                                   <div>
                                     <span className="text-muted-foreground">Dishes: </span>
                                     <span className="font-medium">
                                       {Array.isArray(booking.dishes) ? booking.dishes.length : 0}
                                     </span>
                                   </div>
                                 </div>
                                 <div className="mt-2 flex justify-end">
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={(e) => handleDelete(booking.id, e)}
                                   >
                                     <Trash2 className="h-4 w-4 text-destructive" />
                                   </Button>
                                 </div>
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
                    </TabsContent>

                    {/* Detailed View Tab */}
                    <TabsContent value="details" className="mt-4">
                      <div className="border rounded-lg">
                        <ScrollArea className="h-[500px]">
                          {customerBookings.length > 0 ? (
                            <Table>
                              <TableHeader>
                                 <TableRow>
                                   <TableHead>Date</TableHead>
                                   <TableHead>Dish Name</TableHead>
                                   <TableHead>Trays</TableHead>
                                   <TableHead>Packets</TableHead>
                                   <TableHead>Amount</TableHead>
                                   <TableHead>Status</TableHead>
                                   <TableHead>Actions</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                {customerBookings.map((booking) => {
                                  const dishes = Array.isArray(booking.dishes) ? booking.dishes : [];
                                  if (dishes.length === 0) {
                                    return (
                                      <TableRow key={booking.id}>
                                        <TableCell>{format(new Date(booking.booking_date), 'MMM dd, yyyy')}</TableCell>
                                       <TableCell className="text-muted-foreground italic">No dishes recorded</TableCell>
                                       <TableCell>{booking.total_trays}</TableCell>
                                       <TableCell>{booking.num_packets}</TableCell>
                                       <TableCell className="font-medium">₹{booking.total_cost}</TableCell>
                                       <TableCell>
                                         <Badge variant={booking.payment_status === 'completed' ? 'default' : 'secondary'}>
                                           {booking.payment_status}
                                         </Badge>
                                       </TableCell>
                                       <TableCell>
                                         <Button
                                           variant="ghost"
                                           size="sm"
                                           onClick={(e) => handleDelete(booking.id, e)}
                                         >
                                           <Trash2 className="h-4 w-4 text-destructive" />
                                         </Button>
                                       </TableCell>
                                     </TableRow>
                                    );
                                  }
                                  
                                  return dishes.map((dish: any, idx: number) => (
                                    <TableRow 
                                      key={`${booking.id}-${idx}`}
                                      className="cursor-pointer hover:bg-muted/50"
                                      onClick={() => handleBookingClick(booking)}
                                    >
                                      {idx === 0 && (
                                        <TableCell rowSpan={dishes.length}>
                                          {format(new Date(booking.booking_date), 'MMM dd, yyyy')}
                                        </TableCell>
                                      )}
                                      <TableCell className="font-medium">{dish.name || 'Unknown'}</TableCell>
                                      <TableCell>{dish.quantity || 0}</TableCell>
                                      <TableCell>{dish.packets || 0}</TableCell>
                                      {idx === 0 && (
                                        <>
                                          <TableCell rowSpan={dishes.length} className="font-medium text-green-600">
                                            ₹{booking.total_cost}
                                          </TableCell>
                                           <TableCell rowSpan={dishes.length}>
                                             <Badge variant={booking.payment_status === 'completed' ? 'default' : 'secondary'}>
                                               {booking.payment_status}
                                             </Badge>
                                           </TableCell>
                                           <TableCell rowSpan={dishes.length}>
                                             <Button
                                               variant="ghost"
                                               size="sm"
                                               onClick={(e) => handleDelete(booking.id, e)}
                                             >
                                               <Trash2 className="h-4 w-4 text-destructive" />
                                             </Button>
                                           </TableCell>
                                         </>
                                       )}
                                     </TableRow>
                                  ));
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="p-8 text-center text-muted-foreground">
                              No bookings found for this customer
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  </Tabs>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingBookingId} onOpenChange={(open) => !open && setDeletingBookingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this booking? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
