import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, Package, DollarSign, Layers, Download, Search, Copy, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { getDateRange, exportBookingsCSV, type TimeFilter } from '@/lib/utils/adminUtils';
import { normalizeDishes } from '@/lib/utils/bookingUtils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminBookingDetailsDialog } from './BookingDetailsDialog';

const AdminDashboard = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const itemsPerPage = 10;
  
  const queryClient = useQueryClient();

  const dateRange = getDateRange(timeFilter);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin-dashboard-bookings', dateRange],
    queryFn: async () => {
      let query = supabase.from('bookings').select('*').eq('payment_status', 'completed');

      if (dateRange) {
        query = query.gte('booking_date', dateRange.start).lte('booking_date', dateRange.end);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const bookingsWithDetails = await Promise.all(
        (data || []).map(async (booking) => {
          const [profileRes, freezeDriedRes] = await Promise.all([
            supabase.from('profiles').select('full_name, email, mobile_number').eq('id', booking.user_id).single(),
            supabase.from('freeze_dried_orders').select('*').eq('booking_id', booking.id),
          ]);

          return {
            ...booking,
            profile: profileRes.data,
            freeze_dried_orders: freezeDriedRes.data || [],
          };
        })
      );

      return bookingsWithDetails;
    },
  });

  const stats = useMemo(() => {
    if (!bookings) return { totalOrders: 0, totalRevenue: 0, totalTrays: 0, totalPackets: 0 };

    const totalOrders = bookings.length;
    const totalRevenue = bookings
      .filter((b) => b.payment_status === 'completed')
      .reduce((sum, b) => sum + Number(b.total_cost || 0), 0);
    const totalTrays = bookings.reduce((sum, b) => sum + (b.total_trays || 0), 0);
    const totalPackets = bookings.reduce((sum, b) => {
      const regular = b.num_packets || 0;
      const vacuum = Array.isArray(b.vacuum_packing) ? b.vacuum_packing.length : 0;
      const freezeDried = b.freeze_dried_orders?.[0]?.total_packets || 0;
      return sum + regular + vacuum + freezeDried;
    }, 0);

    return { totalOrders, totalRevenue, totalTrays, totalPackets };
  }, [bookings]);

  const chartData = useMemo(() => {
    if (!bookings) return [];

    const dateMap = new Map<string, { trays: number; packets: number }>();

    bookings.forEach((booking) => {
      const date = booking.booking_date;
      const packets =
        (booking.num_packets || 0) +
        (Array.isArray(booking.vacuum_packing) ? booking.vacuum_packing.length : 0) +
        (booking.freeze_dried_orders?.[0]?.total_packets || 0);

      if (dateMap.has(date)) {
        const existing = dateMap.get(date)!;
        dateMap.set(date, {
          trays: existing.trays + booking.total_trays,
          packets: existing.packets + packets,
        });
      } else {
        dateMap.set(date, { trays: booking.total_trays, packets });
      }
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date: format(parseISO(date), 'MMM dd'),
        trays: data.trays,
        packets: data.packets,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];

    return bookings.filter((booking) => {
      const matchesSearch =
        searchQuery === '' ||
        booking.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.profile?.mobile_number?.includes(searchQuery) ||
        booking.id.substring(0, 8).toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || booking.payment_method === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [bookings, searchQuery, statusFilter, paymentFilter]);

  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, currentPage]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-bookings'] });
      toast.success('Booking deleted successfully');
      setDeletingBookingId(null);
    },
    onError: (error: any) => {
      toast.error('Failed to delete booking: ' + error.message);
    },
  });

  const handleDelete = (id: string) => {
    setDeletingBookingId(id);
  };

  const confirmDelete = () => {
    if (deletingBookingId) {
      deleteMutation.mutate(deletingBookingId);
    }
  };

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id.substring(0, 8));
    toast.success('Order ID copied!');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Dashboard Overview</h2>
          <p className="text-muted-foreground">Monitor your food dehydration operations</p>
        </div>

        <div className="flex gap-2">
          {(['today', 'week', 'month', 'quarter', 'year', 'all'] as TimeFilter[]).map((filter) => (
            <Button
              key={filter}
              variant={timeFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter(filter)}
            >
              {filter === 'all' ? 'All Time' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trays</CardTitle>
            <Layers className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTrays}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packets</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPackets}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Trays vs Packets (Last 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="trays" fill="#eab308" name="Trays" />
              <Bar dataKey="packets" fill="#ef4444" name="Packets" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="cod">COD</SelectItem>
                <SelectItem value="request_only">Request</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => exportBookingsCSV(filteredBookings)}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Dishes</TableHead>
                  <TableHead>Trays</TableHead>
                  <TableHead>Packets</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBookings.map((booking) => {
                  const totalPackets =
                    (booking.num_packets || 0) +
                    (Array.isArray(booking.vacuum_packing) ? booking.vacuum_packing.length : 0) +
                    (booking.freeze_dried_orders?.[0]?.total_packets || 0);

                  return (
                    <TableRow 
                      key={booking.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setDetailsDialogOpen(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{booking.id.substring(0, 8)}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyOrderId(booking.id);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{booking.profile?.full_name || '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>{booking.profile?.email}</div>
                          <div className="text-muted-foreground">{booking.profile?.mobile_number}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1 max-w-xs">
                          {normalizeDishes(booking.dishes).map((dish, idx) => (
                            <div key={idx} className="text-muted-foreground">
                              {dish.name} ({dish.quantity})
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{booking.total_trays}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{totalPackets}</Badge>
                      </TableCell>
                      <TableCell>{format(parseISO(booking.booking_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            booking.payment_method === 'online'
                              ? 'default'
                              : booking.payment_method === 'request_only'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {booking.payment_method === 'online'
                            ? 'Online'
                            : booking.payment_method === 'request_only'
                            ? 'Request'
                            : 'COD'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">₹{Number(booking.total_cost).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={booking.status === 'completed' ? 'default' : booking.status === 'active' ? 'secondary' : 'destructive'}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(booking.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredBookings.length)} of{' '}
              {filteredBookings.length} results
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                Next
              </Button>
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

export default AdminDashboard;
