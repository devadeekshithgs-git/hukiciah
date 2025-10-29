import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { isDateBlocked, isSaturday, formatDate } from '@/lib/utils/dateUtils';
import { findAvailableTrays } from '@/lib/utils/bookingUtils';
import { SATURDAY_MIN_TRAYS, TRAY_CAPACITY } from '@/lib/constants';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

interface DateSelectionProps {
  totalTrays: number;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  onNext: () => void;
  onBack: () => void;
  setAllocatedTrays: (trays: number[]) => void;
  setBookedTraysForDate: (trays: number[]) => void;
}

export const DateSelection = ({
  totalTrays,
  selectedDate,
  setSelectedDate,
  onNext,
  onBack,
  setAllocatedTrays,
  setBookedTraysForDate,
}: DateSelectionProps) => {
  const [realtimeKey, setRealtimeKey] = useState(0);

  // Real-time subscription for instant updates
  useEffect(() => {
    const bookingsChannel = supabase
      .channel('customer-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          setRealtimeKey(prev => prev + 1);
          // Re-validate current selection if date is selected
          if (selectedDate) {
            handleDateSelect(selectedDate);
          }
        }
      )
      .subscribe();

    const configChannel = supabase
      .channel('customer-calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_config',
        },
        () => {
          setRealtimeKey(prev => prev + 1);
          if (selectedDate) {
            handleDateSelect(selectedDate);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(configChannel);
    };
  }, [selectedDate]);

  const getBookedTraysForDate = async (date: Date): Promise<number[]> => {
    const dateStr = formatDate(date);
    
    // Get booked trays from bookings table (RLS policy filters to completed bookings)
    const { data: trayAvailability, error: trayError } = await supabase
      .from('bookings')
      .select('tray_numbers')
      .eq('booking_date', dateStr);
    
    if (trayError) {
      if (import.meta.env.DEV) {
        console.error('Error fetching tray availability:', trayError);
      }
      toast.error('Failed to check availability');
    }

    const bookedFromBookings = trayAvailability?.flatMap(b => b.tray_numbers) || [];
    
    // Get blocked trays from calendar_config
    const { data: calendarConfig } = await supabase
      .from('calendar_config')
      .select('blocked_trays')
      .eq('date', dateStr)
      .maybeSingle();
    
    const blockedTrayNumbers = calendarConfig?.blocked_trays || [];
    
    return [...bookedFromBookings, ...blockedTrayNumbers];
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;

    if (isDateBlocked(date)) {
      toast.error('Orders not accepted - holiday/off day');
      return;
    }

    const dateStr = formatDate(date);
    const bookedTrays = await getBookedTraysForDate(date);
    const availableCount = TRAY_CAPACITY - bookedTrays.length;

    if (isSaturday(date)) {
      // For Saturday validation, we need accurate booking count
      // Query bookings table for this specific date (RLS policy filters to completed bookings)
      const { data: saturdayBookings } = await supabase
        .from('bookings')
        .select('tray_numbers')
        .eq('booking_date', dateStr);
      
      const totalBookedForSaturday = saturdayBookings?.flatMap(b => b.tray_numbers).length || 0;
      
      if (totalBookedForSaturday < SATURDAY_MIN_TRAYS && totalTrays < SATURDAY_MIN_TRAYS) {
        toast.error(
          `Saturday Special: Minimum ${SATURDAY_MIN_TRAYS} trays required. Currently ${totalBookedForSaturday} booked. Delivery on Monday.`,
          { duration: 5000 }
        );
        return;
      }
    }

    if (availableCount < totalTrays) {
      toast.error(`Only ${availableCount} trays available on this date`);
      return;
    }

    const allocated = findAvailableTrays(bookedTrays, totalTrays);
    setAllocatedTrays(allocated);
    setBookedTraysForDate(bookedTrays);
    setSelectedDate(date);
  };

  const handleNext = () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }
    onNext();
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-foreground mb-6">Select Booking Date</h2>

      {isSaturday(selectedDate || new Date()) && (
        <div className="mb-4 p-4 bg-accent/30 rounded-md flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-foreground">
            <strong>Saturday Special:</strong> Minimum {SATURDAY_MIN_TRAYS} trays required unless {SATURDAY_MIN_TRAYS}+ trays already booked. Delivery on Monday.
          </div>
        </div>
      )}

      <div className="mb-6">
        <Calendar
          mode="single"
          selected={selectedDate || undefined}
          onSelect={handleDateSelect}
          disabled={(date) => {
            return date < new Date() || isDateBlocked(date);
          }}
          className="rounded-md border"
        />
      </div>

      {selectedDate && (
        <div className="mb-4 p-4 bg-accent/30 rounded-md">
          <p className="text-sm text-foreground">
            <strong>Selected Date:</strong> {selectedDate.toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedDate}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Next: View Trays
        </Button>
      </div>
    </div>
  );
};
