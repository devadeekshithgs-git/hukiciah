import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminBookingDetailsDialog } from './BookingDetailsDialog';

interface AdminTrayBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  selectedTrays: number[];
  onSuccess: () => void;
}

interface DishEntry {
  name: string;
  trays: number;
  packets: number;
}

export const AdminTrayBookingDialog = ({ open, onOpenChange, selectedDate, onSuccess }: AdminTrayBookingDialogProps) => {
  const [formData, setFormData] = useState({
    customerName: '',
    whatsapp: '',
  });
  const [dishes, setDishes] = useState<DishEntry[]>([{ name: '', trays: 0, packets: 0 }]);
  const [selectedTrays, setSelectedTrays] = useState<number[]>([]);
  const [bookedTrays, setBookedTrays] = useState<number[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const trays = Array.from({ length: 50 }, (_, i) => i + 1);

  // Fetch booked trays for the selected date
  useEffect(() => {
    if (open && selectedDate) {
      fetchBookedTrays();
    }
  }, [open, selectedDate]);

  // Real-time subscription for tray updates
  useEffect(() => {
    if (!open || !selectedDate) return;

    const channel = supabase
      .channel('admin-tray-booking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        async () => {
          // Refetch booked trays when any booking changes
          await fetchBookedTrays();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, selectedDate]);

  const fetchBookedTrays = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        profile:profiles!bookings_user_id_fkey(full_name, email, mobile_number)
      `)
      .eq('booking_date', selectedDate)
      .eq('payment_status', 'completed')
      .eq('status', 'active');

    if (data) {
      setBookings(data);
      const allBooked = data.flatMap(b => b.tray_numbers || []);
      setBookedTrays(allBooked);
    }
  };

  const getBookingForTray = (trayNumber: number) => {
    return bookings.find(
      (b) => b.tray_numbers?.includes(trayNumber)
    );
  };

  const handleTrayClick = (trayNumber: number) => {
    const booking = getBookingForTray(trayNumber);
    
    // If tray is booked, show booking details
    if (booking) {
      setSelectedBooking(booking);
      setDetailsDialogOpen(true);
      return;
    }

    if (selectedTrays.includes(trayNumber)) {
      setSelectedTrays(selectedTrays.filter(t => t !== trayNumber));
    } else {
      setSelectedTrays([...selectedTrays, trayNumber]);
    }
  };

  const addDish = () => {
    setDishes([...dishes, { name: '', trays: 0, packets: 0 }]);
  };

  const removeDish = (index: number) => {
    if (dishes.length > 1) {
      setDishes(dishes.filter((_, i) => i !== index));
    }
  };

  const updateDish = (index: number, field: keyof DishEntry, value: string | number) => {
    const updated = [...dishes];
    updated[index] = { ...updated[index], [field]: value };
    setDishes(updated);
  };

  const handleSubmit = async () => {
    if (!formData.customerName.trim() || !formData.whatsapp.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (selectedTrays.length === 0) {
      toast.error('Please select at least one tray');
      return;
    }

    const validDishes = dishes.filter(d => d.name.trim());
    if (validDishes.length === 0) {
      toast.error('Please add at least one dish');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      if (!adminUser) {
        toast.error('Admin not authenticated');
        return;
      }

      // Format dishes for database
      const formattedDishes = validDishes.map(d => ({
        name: d.name,
        quantity: d.trays,
        packets: d.packets,
      }));

      const totalPackets = validDishes.reduce((sum, d) => sum + d.packets, 0);

      // Insert booking with admin_created flag and customer info in dedicated columns
      const { error } = await supabase.from('bookings').insert({
        user_id: adminUser.id,
        booking_date: selectedDate,
        total_trays: selectedTrays.length,
        tray_numbers: selectedTrays.sort((a, b) => a - b),
        dishes: formattedDishes,
        customer_name: formData.customerName,
        customer_whatsapp: formData.whatsapp,
        num_packets: totalPackets,
        dehydration_cost: 0,
        packing_cost: 0,
        total_cost: 0,
        payment_method: 'request_only',
        payment_status: 'completed',
        admin_created: true,
        delivery_method: 'pickup',
        status: 'active',
      });

      if (error) throw error;

      toast.success(`Successfully booked ${selectedTrays.length} tray(s) for ${formData.customerName}`);
      setFormData({ customerName: '', whatsapp: '' });
      setDishes([{ name: '', trays: 0, packets: 0 }]);
      setSelectedTrays([]);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error creating booking:', error);
      toast.error('Failed to create booking');
    } finally {
      setIsSaving(false);
    }
  };

  const getTrayStatus = (trayNumber: number) => {
    if (bookedTrays.includes(trayNumber)) return 'booked';
    if (selectedTrays.includes(trayNumber)) return 'selected';
    return 'available';
  };

  const getTrayColor = (status: string) => {
    switch (status) {
      case 'booked': return 'hsl(0 0% 62%)';
      case 'selected': return 'hsl(142 76% 36%)';
      default: return 'transparent';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create Admin Booking</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Customer Information */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    placeholder="Enter customer name"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    placeholder="Enter WhatsApp number"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Tray Selection */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Select Trays</h3>
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedTrays.length} tray(s)
                </p>
              </div>
              <div className="grid grid-cols-10 gap-2">
                {trays.map((trayNumber) => {
                  const status = getTrayStatus(trayNumber);
                  const color = getTrayColor(status);
                  const booking = getBookingForTray(trayNumber);
                  
                  return (
                    <TooltipProvider key={trayNumber}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() => handleTrayClick(trayNumber)}
                            className={`aspect-square rounded flex items-center justify-center text-sm font-bold border-2 transition-all ${
                              status === 'booked' ? 'cursor-pointer hover:scale-110' : 'cursor-pointer hover:scale-110'
                            }`}
                            style={{
                              backgroundColor: color,
                              color: status === 'available' ? 'hsl(var(--foreground))' : 'white',
                              borderColor: status === 'available' ? 'hsl(var(--border))' : 'transparent',
                            }}
                          >
                            {trayNumber}
                          </div>
                        </TooltipTrigger>
                        {booking && (
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">{booking.profile?.full_name || 'Admin Booking'}</p>
                              {booking.profile?.email && <p className="text-sm">{booking.profile.email}</p>}
                              {booking.profile?.mobile_number && <p className="text-sm">{booking.profile.mobile_number}</p>}
                              <p className="text-sm font-bold">Click to view details</p>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2" style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }} />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: getTrayColor('selected') }} />
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: getTrayColor('booked') }} />
                  <span>Booked</span>
                </div>
              </div>
            </div>

            {/* Dish Information */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Dish Information</h3>
                <Button type="button" variant="outline" size="sm" onClick={addDish}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Dish
                </Button>
              </div>
              {dishes.map((dish, index) => (
                <div key={index} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
                  <div className="space-y-2">
                    <Label htmlFor={`dish-name-${index}`}>Dish Name</Label>
                    <Input
                      id={`dish-name-${index}`}
                      placeholder="Enter dish name"
                      value={dish.name}
                      onChange={(e) => updateDish(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`dish-trays-${index}`}>Trays</Label>
                    <Input
                      id={`dish-trays-${index}`}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={dish.trays || ''}
                      onChange={(e) => updateDish(index, 'trays', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`dish-packets-${index}`}>Packets</Label>
                    <Input
                      id={`dish-packets-${index}`}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={dish.packets || ''}
                      onChange={(e) => updateDish(index, 'packets', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  {dishes.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDish(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Date: {selectedDate}</p>
              <p className="text-sm text-muted-foreground">
                Selected Trays: {selectedTrays.length > 0 ? selectedTrays.sort((a, b) => a - b).join(', ') : 'None'}
              </p>
              <p className="text-sm font-medium mt-2">Total: {selectedTrays.length} tray(s)</p>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Creating...' : 'Create Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AdminBookingDetailsDialog
        booking={selectedBooking}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </Dialog>
  );
};
