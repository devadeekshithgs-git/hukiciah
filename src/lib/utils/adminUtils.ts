import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from 'date-fns';

export type TimeFilter = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface DateRange {
  start: string;
  end: string;
}

export function getDateRange(filter: TimeFilter): DateRange | null {
  const now = new Date();
  
  switch (filter) {
    case 'today':
      return {
        start: format(startOfDay(now), 'yyyy-MM-dd'),
        end: format(endOfDay(now), 'yyyy-MM-dd'),
      };
    case 'week':
      return {
        start: format(startOfWeek(now), 'yyyy-MM-dd'),
        end: format(endOfWeek(now), 'yyyy-MM-dd'),
      };
    case 'month':
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'quarter':
      return {
        start: format(startOfQuarter(now), 'yyyy-MM-dd'),
        end: format(endOfQuarter(now), 'yyyy-MM-dd'),
      };
    case 'year':
      return {
        start: format(startOfYear(now), 'yyyy-MM-dd'),
        end: format(endOfYear(now), 'yyyy-MM-dd'),
      };
    case 'all':
      return null;
    default:
      return null;
  }
}

export function exportBookingsCSV(bookings: any[]) {
  if (!bookings || bookings.length === 0) {
    return;
  }

  const headers = [
    'Order ID',
    'Customer Name',
    'Email',
    'Phone',
    'Booking Date',
    'Trays',
    'Tray Numbers',
    'Packets',
    'Status',
    'Payment Method',
    'Payment Status',
    'Amount',
  ];

  const rows = bookings.map((booking) => {
    const totalPackets = 
      (booking.num_packets || 0) +
      (Array.isArray(booking.vacuum_packing) ? booking.vacuum_packing.length : 0) +
      (booking.freeze_dried_orders?.[0]?.total_packets || 0);

    return [
      booking.id.substring(0, 8),
      booking.profile?.full_name || '-',
      booking.profile?.email || '-',
      booking.profile?.mobile_number || '-',
      booking.booking_date,
      booking.total_trays,
      booking.tray_numbers?.join('; ') || '-',
      totalPackets,
      booking.status,
      booking.payment_method,
      booking.payment_status,
      booking.total_cost,
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function calculateTrayStatus(
  trayNumber: number,
  bookings: any[],
  blockedTrays: number[],
  isHoliday: boolean
): 'available' | 'booked' | 'admin-booked' | 'blocked' | 'holiday' {
  if (isHoliday) return 'holiday';
  if (blockedTrays.includes(trayNumber)) return 'blocked';
  
  const booking = bookings.find((b) =>
    b.tray_numbers?.includes(trayNumber) && 
    b.payment_status === 'completed'
  );
  
  if (booking) {
    return booking.admin_created ? 'admin-booked' : 'booked';
  }
  return 'available';
}

export function getTrayStatusColor(status: string): string {
  switch (status) {
    case 'available':
      return 'transparent'; // No color for available
    case 'booked':
      return 'hsl(0 0% 62%)'; // Grey for customer bookings
    case 'admin-booked':
      return 'hsl(45 93% 47%)'; // Yellow for admin bookings
    case 'blocked':
      return 'hsl(0 0% 62%)'; // Grey for blocked
    case 'selected':
      return 'hsl(142 71% 45%)'; // Green for selected
    case 'holiday':
      return 'hsl(0 85% 95%)'; // Light pink
    default:
      return 'transparent';
  }
}
