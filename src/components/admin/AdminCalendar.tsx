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

const AdminCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isHoliday, setIsHoliday] = useState(false);
  const [notice, setNotice] = useState('');
  const [blockedTrays, setBlockedTrays] = useState('');
  
  const queryClient = useQueryClient();

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
      toast.success('Calendar configuration saved');
    },
    onError: (error) => {
      toast.error('Failed to save configuration: ' + error.message);
    },
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Configure {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Date'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="holiday"
              checked={isHoliday}
              onCheckedChange={setIsHoliday}
            />
            <Label htmlFor="holiday">Mark as Holiday</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notice">Notice (Optional)</Label>
            <Textarea
              id="notice"
              placeholder="Add a notice for this date..."
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blocked-trays">Blocked Tray Numbers (comma-separated)</Label>
            <Input
              id="blocked-trays"
              placeholder="1, 5, 10, 25"
              value={blockedTrays}
              onChange={(e) => setBlockedTrays(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: 1, 5, 10 (these trays won't be available for booking)
            </p>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!selectedDate || saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCalendar;
