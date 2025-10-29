import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminTrayBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  selectedTrays: number[];
  onSuccess: () => void;
}

export const AdminTrayBookingDialog = ({ open, onOpenChange, selectedDate, selectedTrays, onSuccess }: AdminTrayBookingDialogProps) => {
  const [formData, setFormData] = useState({
    customerName: '',
    whatsapp: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!formData.customerName.trim() || !formData.whatsapp.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (selectedTrays.length === 0) {
      toast.error('Please select at least one tray');
      return;
    }

    setIsSaving(true);
    try {
      // Create a dummy user profile or use a special admin user ID
      // For simplicity, we'll create a booking with admin marker
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      if (!adminUser) {
        toast.error('Admin not authenticated');
        return;
      }

      // Insert booking with admin_created flag
      const { error } = await supabase.from('bookings').insert({
        user_id: adminUser.id, // Use admin's ID
        booking_date: selectedDate,
        total_trays: selectedTrays.length,
        tray_numbers: selectedTrays,
        dishes: [{ name: `Manual booking for ${formData.customerName}`, quantity: selectedTrays.length, packets: 0 }],
        num_packets: 0,
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
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error creating booking:', error);
      toast.error('Failed to create booking');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Admin Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">Date: {selectedDate}</p>
            <p className="text-sm text-muted-foreground">Selected Trays: {selectedTrays.join(', ')}</p>
            <p className="text-sm font-medium mt-2">Total: {selectedTrays.length} tray(s)</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Creating...' : 'Create Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
