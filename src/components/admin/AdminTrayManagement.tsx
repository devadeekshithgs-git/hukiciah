import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import AdminTrayGrid from './AdminTrayGrid';
import { Loader2 } from 'lucide-react';

const AdminTrayManagement = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [realtimeKey, setRealtimeKey] = useState(0);

  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['tray-bookings', selectedDate, realtimeKey],
    queryFn: async () => {
      if (!selectedDate) return [];

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('bookings')
        .select('*, tray_numbers')
        .eq('booking_date', dateStr)
        .eq('payment_status', 'completed');

      if (error) throw error;

      // Fetch profiles for each booking
      const bookingsWithProfiles = await Promise.all(
        (data || []).map(async (booking) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, mobile_number')
            .eq('id', booking.user_id)
            .single();

          return { ...booking, profile };
        })
      );

      return bookingsWithProfiles;
    },
    enabled: !!selectedDate,
  });

  const { data: calendarConfig, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['calendar-config', selectedDate, realtimeKey],
    queryFn: async () => {
      if (!selectedDate) return null;

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('calendar_config')
        .select('*')
        .eq('date', dateStr)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!selectedDate,
  });

  // Real-time subscription for instant updates
  useEffect(() => {
    const bookingsChannel = supabase
      .channel('admin-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          setRealtimeKey(prev => prev + 1);
        }
      )
      .subscribe();

    const configChannel = supabase
      .channel('admin-calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_config',
        },
        () => {
          setRealtimeKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(configChannel);
    };
  }, []);

  const isLoading = bookingsLoading || configLoading;
  const bookedTrays = bookingsData?.filter(b => b.payment_status === 'completed').length || 0;

  const handleUpdate = () => {
    setRealtimeKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Tray Management</h2>
        <p className="text-muted-foreground">Visualize and manage tray bookings</p>
      </div>

      <div className="grid md:grid-cols-[350px_1fr] gap-6">
        {/* Date Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border pointer-events-auto"
            />
          </CardContent>
        </Card>

        {/* Tray Grid */}
        <Card>
          <CardHeader>
            <CardTitle>
              Tray Layout - {selectedDate ? format(selectedDate, 'EEEE, MMMM dd, yyyy') : 'Select a date'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {bookedTrays} trays booked out of 50
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <AdminTrayGrid
                bookings={bookingsData || []}
                blockedTrays={calendarConfig?.blocked_trays || []}
                isHoliday={calendarConfig?.is_holiday || false}
                selectedDate={selectedDate || new Date()}
                onUpdate={handleUpdate}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminTrayManagement;
