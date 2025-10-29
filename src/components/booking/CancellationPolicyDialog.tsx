import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface CancellationPolicyDialogProps {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
  totalCost: number;
}

export const CancellationPolicyDialog = ({
  open,
  onAccept,
  onClose,
  totalCost,
}: CancellationPolicyDialogProps) => {
  const [accepted, setAccepted] = useState(false);
  const creditAmount = Math.round(totalCost * 0.5);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Cancellation Policy</DialogTitle>
          <DialogDescription className="text-foreground text-base pt-4">
            <strong>Important:</strong> If you choose to cancel this booking, 50% of your payment (₹{creditAmount}) can be used towards your next order within 6 months. 
            <br/><br/>
            <strong className="text-destructive">Please note:</strong> The remaining 50% will not be refunded. No cash refunds will be issued for any cancellations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-start space-x-3 p-4 bg-accent/30 rounded-md mt-4">
          <Checkbox
            id="accept-policy"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked as boolean)}
          />
          <label
            htmlFor="accept-policy"
            className="text-sm text-foreground cursor-pointer leading-relaxed font-medium"
          >
            I understand and accept the cancellation policy
          </label>
        </div>

        <Button
          onClick={onAccept}
          disabled={!accepted}
          className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 mt-4"
        >
          Continue to Payment
        </Button>
      </DialogContent>
    </Dialog>
  );
};
