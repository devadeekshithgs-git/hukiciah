import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface DeliveryMethodDialogProps {
  open: boolean;
  onConfirm: (method: string) => void;
}

export const DeliveryMethodDialog = ({
  open,
  onConfirm,
}: DeliveryMethodDialogProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  const handleConfirm = () => {
    if (selectedMethod) {
      onConfirm(selectedMethod);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">
            How will you deliver your items to HUKI?
          </DialogTitle>
        </DialogHeader>
        
        <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod} className="space-y-4 py-4">
          <div className="flex items-center space-x-3 p-4 bg-accent/30 rounded-md hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="self_delivery" id="self_delivery" />
            <Label htmlFor="self_delivery" className="text-foreground cursor-pointer flex-1">
              Self delivery (I will bring items myself)
            </Label>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-accent/30 rounded-md hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="third_party" id="third_party" />
            <Label htmlFor="third_party" className="text-foreground cursor-pointer flex-1">
              Porter/Uber/Rapido (Third-party delivery)
            </Label>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-accent/30 rounded-md hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="not_sure" id="not_sure" />
            <Label htmlFor="not_sure" className="text-foreground cursor-pointer flex-1">
              Not sure yet
            </Label>
          </div>
        </RadioGroup>

        <Button
          onClick={handleConfirm}
          disabled={!selectedMethod}
          className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Confirm
        </Button>
      </DialogContent>
    </Dialog>
  );
};
