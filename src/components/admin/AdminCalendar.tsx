import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DayContentProps } from 'react-day-picker';

const AdminCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isHoliday, setIsHoliday] = useState(false);
  const [notice, setNotice] = useState('');
  const [blockedTrays, setBlockedTrays] = useState('');
  
  const queryClient = useQueryClient();

  // Fetch all calendar configs for visual indicators
  const { data: allConfigs } = useQuery({
    queryKey: ['all-calendar-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_config')
        .select('*');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: config } = useQuery({
    queryKey: ['calendar-config', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('calendar_config')
        .select('*')
        .eq('date', dateStr)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setIsHoliday(data.is_holiday || false);
        setNotice(data.notice || '');
        setBlockedTrays(data.blocked_trays?.join(', ') || '');
      } else {
        setIsHoliday(false);
        setNotice('');
        setBlockedTrays('');
      }
      
      return data;
    },
    enabled: !!selectedDate,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate) return;
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const blockedTraysArray = blockedTrays
        .split(',')
        .map(t => parseInt(t.trim()))
        .filter(n => !isNaN(n));

      const configData = {
        date: dateStr,
        is_holiday: isHoliday,
        notice: notice || null,
        blocked_trays: blockedTraysArray,
      };

      if (config) {
        const { error } = await supabase
          .from('calendar_config')
          .update(configData)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('calendar_config')
          .insert(configData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-config'] });
      queryClient.invalidateQueries({ queryKey: ['all-calendar-configs'] });
      toast.success('Calendar configuration saved');
    },
    onError: (error) => {
      toast.error('Failed to save configuration: ' + error.message);
    },
  });

  const getDayConfig = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return allConfigs?.find((config) => config.date === dateStr);
  };

  const customDayContent = (props: DayContentProps) => {
    const dayConfig = getDayConfig(props.date);
    const hasConfig = !!dayConfig;
    const isHolidayDay = dayConfig?.is_holiday;
    const hasNotice = !!dayConfig?.notice;
    const hasBlockedTrays = dayConfig?.blocked_trays && dayConfig.blocked_trays.length > 0;

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{format(props.date, 'd')}</span>
        {hasConfig && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-0.5">
            {isHolidayDay && <div className="w-1.5 h-1.5 rounded-full bg-destructive" />}
            {hasNotice && !isHolidayDay && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
            {hasBlockedTrays && !isHolidayDay && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Calendar Management</h2>
        <p className="text-muted-foreground">Configure holidays, notices, and blocked trays</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border pointer-events-auto"
              components={{
                DayContent: customDayContent,
              }}
            />

            {/* Legend */}
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium">Legend:</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-xs text-muted-foreground">Holiday (no bookings allowed)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Has Notice (special message)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <span className="text-xs text-muted-foreground">Blocked Trays (some unavailable)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configure Selected Date</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM dd, yyyy') : 'Select a date'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="holiday"
                  checked={isHoliday}
                  onCheckedChange={setIsHoliday}
                />
                <div>
                  <Label htmlFor="holiday" className="font-medium">Mark as Holiday</Label>
                  <p className="text-xs text-muted-foreground">Customers cannot book on holidays</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice">Notice Message (Optional)</Label>
              <Textarea
                id="notice"
                placeholder="Add a special notice or message for this date..."
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{notice.length}/500 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blocked-trays">Blocked Trays (Optional)</Label>
              <Input
                id="blocked-trays"
                placeholder="e.g., 1, 5, 10, 25"
                value={blockedTrays}
                onChange={(e) => setBlockedTrays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter tray numbers separated by commas. These trays won't be available for booking.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsHoliday(false);
                  setNotice('');
                  setBlockedTrays('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!selectedDate || saveMutation.isPending}
                className="flex-1"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCalendar;
