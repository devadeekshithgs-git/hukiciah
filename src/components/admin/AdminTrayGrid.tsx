import { useState, useMemo } from 'react';
import { calculateTrayStatus, getTrayStatusColor, getCustomerColor } from '@/lib/utils/adminUtils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { AdminTrayBookingDialog } from './AdminTrayBookingDialog';
import { AdminBookingDetailsDialog } from './BookingDetailsDialog';
import { ADMIN_TRAY_CAPACITY } from '@/lib/constants';

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
  const trays = Array.from({ length: ADMIN_TRAY_CAPACITY }, (_, i) => i + 1);

  // Build a map of unique customers to assign consistent colors
  const customerColorMap = useMemo(() => {
    const completedBookings = bookings.filter(b => b.payment_status === 'completed');
    const uniqueUserIds = [...new Set(completedBookings.map(b => b.user_id))];
    const map = new Map<string, number>();
    uniqueUserIds.forEach((userId, index) => {
      map.set(userId, index);
    });
    return map;
  }, [bookings]);

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

  const getTrayBackgroundColor = (trayNumber: number, status: string) => {
    const booking = getBookingForTray(trayNumber);
    
    if (booking && status === 'booked') {
      const customerIndex = customerColorMap.get(booking.user_id) ?? 0;
      return getCustomerColor(booking.user_id, customerIndex);
    }
    
    if (status === 'admin-booked') {
      return getTrayStatusColor('admin-booked');
    }
    
    return getTrayStatusColor(status);
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
            <Button variant="destructive" onClick={() => {
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
          const bgColor = getTrayBackgroundColor(trayNumber, status);
          const isBlocked = status === 'blocked';
          const isAvailable = status === 'available';

          return (
            <div
              key={trayNumber}
              onClick={() => handleTrayClick(trayNumber)}
              className={`min-h-[100px] rounded-lg flex flex-col items-center justify-center p-2 border-2 transition-all text-center relative overflow-hidden ${
                booking ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : ''
              } ${
                editMode && isAvailable ? 'cursor-pointer hover:scale-[1.02]' : ''
              } ${
                editMode && (status === 'booked' || status === 'admin-booked' || status === 'holiday') ? 'cursor-not-allowed opacity-60' : ''
              } ${
                isBlocked && !editMode ? 'bg-stripes' : ''
              }`}
              style={{
                backgroundColor: bgColor,
                color: isAvailable ? 'hsl(var(--foreground))' : 'white',
                borderColor: isAvailable ? 'hsl(var(--border))' : 'transparent',
              }}
            >
              {/* Tray Number */}
              <span className={`font-bold ${booking ? 'text-lg' : 'text-2xl'}`}>
                {trayNumber}
              </span>
              
              {/* Customer Details (only for booked trays) */}
              {booking && (
                <div className="mt-1 text-[10px] leading-tight space-y-0.5">
                  <div className="font-semibold truncate max-w-full">
                    {booking.profile?.full_name || 'Unknown'}
                  </div>
                  <div className="opacity-90 truncate max-w-full">
                    {booking.profile?.mobile_number || ''}
                  </div>
                  <div className="font-medium">
                    ₹{Number(booking.total_cost).toFixed(0)}
                  </div>
                </div>
              )}
              
              {/* Blocked indicator */}
              {isBlocked && !editMode && (
                <span className="text-xs mt-1 text-muted-foreground font-medium">Blocked</span>
              )}
            </div>
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
            className="w-6 h-6 rounded"
            style={{ backgroundColor: 'hsl(221 83% 53%)' }}
          />
          <span className="text-sm">Customer Booking</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded"
            style={{ backgroundColor: getTrayStatusColor('admin-booked') }}
          />
          <span className="text-sm">Admin Booking</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border-2 bg-stripes"
            style={{ backgroundColor: 'hsl(0 0% 95%)', borderColor: 'hsl(var(--border))' }}
          />
          <span className="text-sm">Blocked</span>
        </div>
        {editMode && (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded"
              style={{ backgroundColor: getTrayStatusColor('selected') }}
            />
            <span className="text-sm">Selected for Blocking</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded"
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
