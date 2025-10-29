import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminBookings = () => {
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    status: '',
    payment_status: '',
    payment_method: '',
  });
  
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      // Optimized query: fetch bookings with related data in fewer round trips
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Get unique user IDs
      const userIds = [...new Set(bookingsData.map(b => b.user_id))];
      
      // Batch fetch all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, mobile_number')
        .in('id', userIds);

      // Batch fetch all freeze-dried orders
      const bookingIds = bookingsData.map(b => b.id);
      const { data: freezeDriedOrders } = await supabase
        .from('freeze_dried_orders')
        .select('*')
        .in('booking_id', bookingIds);

      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const freezeDriedMap = new Map<string, any[]>();
      freezeDriedOrders?.forEach(order => {
        if (!freezeDriedMap.has(order.booking_id)) {
          freezeDriedMap.set(order.booking_id, []);
        }
        freezeDriedMap.get(order.booking_id)!.push(order);
      });

      // Combine data
      return bookingsData.map(booking => ({
        ...booking,
        profile: profileMap.get(booking.user_id),
        freeze_dried_orders: freezeDriedMap.get(booking.id) || [],
      }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast.success('Booking updated successfully');
      setEditingBooking(null);
    },
    onError: (error: any) => {
      toast.error('Failed to update booking: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast.success('Booking deleted successfully');
      setDeletingBookingId(null);
    },
    onError: (error: any) => {
      toast.error('Failed to delete booking: ' + error.message);
    },
  });

  const handleEdit = (booking: any) => {
    setEditingBooking(booking);
    setEditForm({
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method,
    });
  };

  const handleSaveEdit = () => {
    if (!editingBooking) return;
    updateMutation.mutate({
      id: editingBooking.id,
      updates: editForm,
    });
  };

  const handleDelete = (id: string) => {
    setDeletingBookingId(id);
  };

  const confirmDelete = () => {
    if (deletingBookingId) {
      deleteMutation.mutate(deletingBookingId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
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
                  <TableHead>Actions</TableHead>
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
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(booking)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(booking.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Booking Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_status">Payment Status</Label>
              <Select
                value={editForm.payment_status}
                onValueChange={(value) => setEditForm({ ...editForm, payment_status: value })}
              >
                <SelectTrigger id="payment_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={editForm.payment_method}
                onValueChange={(value) => setEditForm({ ...editForm, payment_method: value })}
              >
                <SelectTrigger id="payment_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="cod">COD</SelectItem>
                  <SelectItem value="request_only">Request Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBooking(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingBookingId} onOpenChange={(open) => !open && setDeletingBookingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
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
    </>
  );
};

export default AdminBookings;
