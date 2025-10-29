import { useState } from 'react';
import { calculateTrayStatus, getTrayStatusColor } from '@/lib/utils/adminUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { AdminTrayBookingDialog } from './AdminTrayBookingDialog';
import { AdminBookingDetailsDialog } from './BookingDetailsDialog';

interface AdminTrayGridProps {
  bookings: any[];
  blockedTrays: number[];
  isHoliday: boolean;
  selectedDate: Date;
  onUpdate: () => void;
}

const AdminTrayGrid = ({ bookings, blockedTrays, isHoliday, selectedDate, onUpdate }: AdminTrayGridProps) => {
  const [editMode, setEditMode] = useState(false);
  const [selectedTrays, setSelectedTrays] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const trays = Array.from({ length: 50 }, (_, i) => i + 1);

  const getBookingForTray = (trayNumber: number) => {
    return bookings.find(
      (b) => b.tray_numbers?.includes(trayNumber) && b.payment_status === 'completed'
    );
  };

  const getTrayDisplayStatus = (trayNumber: number) => {
    if (editMode && selectedTrays.includes(trayNumber)) return 'selected';
    return calculateTrayStatus(trayNumber, bookings, blockedTrays, isHoliday);
  };

  const handleTrayClick = (trayNumber: number) => {
    const booking = getBookingForTray(trayNumber);
    
    // If not in edit mode and tray is booked, show details
    if (!editMode && booking) {
      setSelectedBooking(booking);
      setDetailsDialogOpen(true);
      return;
    }
    
    if (!editMode) return;
    
    if (booking) {
      toast.error('Cannot block a booked tray');
      return;
    }
    
    if (isHoliday) {
      toast.error('Cannot modify trays on holiday');
      return;
    }

    if (selectedTrays.includes(trayNumber)) {
      setSelectedTrays(selectedTrays.filter(t => t !== trayNumber));
    } else {
      setSelectedTrays([...selectedTrays, trayNumber]);
    }
  };

  const handleSaveBlocking = async () => {
    setIsSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data: existing } = await supabase
        .from('calendar_config')
        .select('*')
        .eq('date', dateStr)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('calendar_config')
          .update({ blocked_trays: selectedTrays })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('calendar_config')
          .insert({
            date: dateStr,
            blocked_trays: selectedTrays,
            is_holiday: false,
          });
        
        if (error) throw error;
      }

      toast.success('Tray blocking updated');
      setEditMode(false);
      setSelectedTrays([]);
      onUpdate();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error saving blocked trays:', error);
      toast.error('Failed to update tray blocking');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Edit Mode Controls */}
      <div className="flex gap-3 justify-end">
        {!editMode ? (
          <>
            <Button variant="outline" onClick={() => setBookingDialogOpen(true)}>
              Create Admin Booking
            </Button>
            <Button onClick={() => {
              setEditMode(true);
              setSelectedTrays([...blockedTrays]);
            }}>
              Edit Tray Blocking
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => {
              setEditMode(false);
              setSelectedTrays([]);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveBlocking} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        )}
      </div>

      {editMode && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-foreground">
            <strong>Edit Mode:</strong> Click on available trays to block/unblock them. Currently blocking: {selectedTrays.length} trays
          </p>
        </div>
      )}

      <div className="grid grid-cols-5 gap-3">
        {trays.map((trayNumber) => {
          const status = getTrayDisplayStatus(trayNumber);
          const booking = getBookingForTray(trayNumber);
          const color = getTrayStatusColor(status);

          return (
            <TooltipProvider key={trayNumber}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => handleTrayClick(trayNumber)}
                    className={`aspect-square rounded-lg flex items-center justify-center text-lg font-bold border-2 transition-all ${
                      booking ? 'cursor-pointer hover:scale-105' : ''
                    } ${
                      editMode && status === 'available' ? 'cursor-pointer hover:scale-105' : ''
                    } ${
                      editMode && (status === 'booked' || status === 'admin-booked' || status === 'holiday') ? 'cursor-not-allowed opacity-60' : ''
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
                      <p className="font-semibold">{booking.profile?.full_name}</p>
                      <p className="text-sm">{booking.profile?.email}</p>
                      <p className="text-sm">{booking.profile?.mobile_number}</p>
                      <p className="text-sm font-medium">
                        Payment: {booking.payment_method === 'online' ? 'Online' : 'Online'}
                      </p>
                      <p className="text-sm font-bold">₹{Number(booking.total_cost).toFixed(2)}</p>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center pt-4 border-t">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border-2"
            style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }}
          />
          <span className="text-sm">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border-2"
            style={{ backgroundColor: getTrayStatusColor('booked') }}
          />
          <span className="text-sm">Customer Booking</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border-2"
            style={{ backgroundColor: getTrayStatusColor('admin-booked') }}
          />
          <span className="text-sm">Admin Booking</span>
        </div>
        {editMode && (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border-2"
              style={{ backgroundColor: getTrayStatusColor('selected') }}
            />
            <span className="text-sm">Selected for Blocking</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border-2"
            style={{ backgroundColor: getTrayStatusColor('holiday') }}
          />
          <span className="text-sm">Holiday</span>
        </div>
      </div>

      <AdminTrayBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        selectedDate={format(selectedDate, 'yyyy-MM-dd')}
        selectedTrays={[]}
        onSuccess={onUpdate}
      />

      <AdminBookingDetailsDialog
        booking={selectedBooking}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
};

export default AdminTrayGrid;
