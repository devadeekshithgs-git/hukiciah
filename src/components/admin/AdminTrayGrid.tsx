import { calculateTrayStatus, getTrayStatusColor } from '@/lib/utils/adminUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdminTrayGridProps {
  bookings: any[];
  blockedTrays: number[];
  isHoliday: boolean;
  selectedDate: Date;
}

const AdminTrayGrid = ({ bookings, blockedTrays, isHoliday, selectedDate }: AdminTrayGridProps) => {
  const trays = Array.from({ length: 50 }, (_, i) => i + 1);

  const getBookingForTray = (trayNumber: number) => {
    return bookings.find(
      (b) => b.tray_numbers?.includes(trayNumber) && b.payment_status === 'completed'
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-3">
        {trays.map((trayNumber) => {
          const status = calculateTrayStatus(trayNumber, bookings, blockedTrays, isHoliday);
          const booking = getBookingForTray(trayNumber);
          const color = getTrayStatusColor(status);

          return (
            <TooltipProvider key={trayNumber}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="aspect-square rounded-lg flex items-center justify-center text-lg font-bold border-2 cursor-pointer transition-transform hover:scale-105"
                    style={{
                      backgroundColor: color,
                      color: status === 'available' || status === 'booked' ? 'white' : 'hsl(var(--foreground))',
                      borderColor: status === 'booked' ? 'hsl(var(--destructive))' : 'transparent',
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
                        Payment: {booking.payment_method === 'online' ? 'Online' : booking.payment_method === 'request_only' ? 'Request' : 'COD'}
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
            style={{ backgroundColor: getTrayStatusColor('available') }}
          />
          <span className="text-sm">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border-2"
            style={{ backgroundColor: getTrayStatusColor('booked'), borderColor: 'hsl(var(--destructive))' }}
          />
          <span className="text-sm">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border-2"
            style={{ backgroundColor: getTrayStatusColor('blocked') }}
          />
          <span className="text-sm">Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border-2"
            style={{ backgroundColor: getTrayStatusColor('holiday') }}
          />
          <span className="text-sm">Holiday</span>
        </div>
      </div>
    </div>
  );
};

export default AdminTrayGrid;
