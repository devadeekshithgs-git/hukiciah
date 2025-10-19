import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2 } from 'lucide-react';

interface PaymentConfirmationScreenProps {
  open: boolean;
  onClose: () => void;
  amountPaid: number;
  totalTrays: number;
  numVarieties: number;
  numPackets: number;
  orderId: string;
}

export const PaymentConfirmationScreen = ({
  open,
  onClose,
  amountPaid,
  totalTrays,
  numVarieties,
  numPackets,
  orderId,
}: PaymentConfirmationScreenProps) => {
  const creditAmount = Math.round(amountPaid * 0.5);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <DialogTitle className="text-center text-2xl text-foreground">
            Payment Successful!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-accent/30 p-4 rounded-md space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">Amount Paid:</span>
              <span className="font-semibold text-foreground">₹{amountPaid}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground">Trays Booked:</span>
              <span className="font-semibold text-foreground">{totalTrays}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground">Items/Varieties:</span>
              <span className="font-semibold text-foreground">{numVarieties}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground">Packets:</span>
              <span className="font-semibold text-foreground">{numPackets}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-3">
              <span className="text-foreground">Booking Reference:</span>
              <span className="font-mono text-xs text-foreground">{orderId.slice(0, 8)}</span>
            </div>
          </div>

          <div className="bg-accent/50 p-4 rounded-md">
            <p className="text-sm text-foreground">
              <strong>Cancellation Policy Reminder:</strong> If you cancel, 50% (₹{creditAmount}) can be used within 6 months for your next order.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
