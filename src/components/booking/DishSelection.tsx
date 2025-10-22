import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DishSelectionProps {
  dishes: { name: string; quantity: number; packets?: number }[];
  setDishes: (dishes: { name: string; quantity: number; packets?: number }[]) => void;
  numPackets: number;
  setNumPackets: (num: number) => void;
  onNext: () => void;
}

export const DishSelection = ({ dishes, setDishes, numPackets, setNumPackets, onNext }: DishSelectionProps) => {
  const totalTrays = dishes.reduce((sum, dish) => sum + (dish.quantity || 0), 0);

  // Automatically set packets equal to trays
  useEffect(() => {
    setNumPackets(totalTrays);
  }, [totalTrays, setNumPackets]);

  const addDish = () => {
    if (totalTrays >= 24) {
      toast.error('Maximum 24 trays allowed');
      return;
    }
    setDishes([...dishes, { name: '', quantity: 1 }]);
  };

  const removeDish = (index: number) => {
    if (dishes.length === 1) {
      toast.error('At least one dish is required');
      return;
    }
    setDishes(dishes.filter((_, i) => i !== index));
  };

  const updateDish = (index: number, field: 'name' | 'quantity' | 'packets', value: string | number) => {
    const newDishes = [...dishes];
    if (field === 'quantity') {
      const qty = Number(value);
      const otherTrays = dishes.reduce((sum, d, i) => i !== index ? sum + d.quantity : sum, 0);
      if (otherTrays + qty > 24) {
        toast.error('Total trays cannot exceed 24');
        return;
      }
      newDishes[index][field] = qty;
    } else if (field === 'packets') {
      newDishes[index][field] = Number(value);
    } else {
      newDishes[index][field] = value as string;
    }
    setDishes(newDishes);
  };

  const handleNext = () => {
    if (dishes.some(d => !d.name.trim())) {
      toast.error('Please fill in all dish names');
      return;
    }
    if (totalTrays === 0) {
      toast.error('Please add at least one tray');
      return;
    }
    onNext();
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-foreground mb-6">Select Your Dishes</h2>

      <div className="mb-6 p-4 bg-accent/30 rounded-md">
        <p className="text-sm text-foreground mb-2">
          <strong>Important:</strong>
        </p>
        <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
          <li>One item per tray, up to one litre</li>
          <li>Only one variety per tray. For example, Idly and Chutney will be 2 trays and not 1.</li>
          <li>Minimum quantity per item is one litre (even if less, counts as 1 tray)</li>
          <li>Packets are determined by the quantity you order. For example, 1 liter can be divided into either five 200-gram packets or four 250-gram packets, depending on your requirements.</li>
        </ul>
      </div>

      <div className="space-y-4 mb-6">
        {dishes.map((dish, index) => (
          <div key={index} className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor={`dish-${index}`}>Dish Name</Label>
              <Input
                id={`dish-${index}`}
                value={dish.name}
                onChange={(e) => updateDish(index, 'name', e.target.value)}
                placeholder="e.g., Paneer Gravy, Fried rice, Idly, Chutney"
              />
            </div>
            <div className="w-32">
              <Label htmlFor={`qty-${index}`}>Trays</Label>
              <Input
                id={`qty-${index}`}
                type="number"
                min="1"
                max="24"
                value={dish.quantity}
                onChange={(e) => updateDish(index, 'quantity', e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="w-32">
              <Label htmlFor={`packets-${index}`} className="text-foreground font-semibold">
                Packets
              </Label>
              <Input
                id={`packets-${index}`}
                type="number"
                min="0"
                value={dish.packets || ''}
                onChange={(e) => updateDish(index, 'packets', e.target.value)}
                placeholder="No. of packets"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ₹10 per packet
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => removeDish(index)}
              disabled={dishes.length === 1}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={addDish}
          disabled={totalTrays >= 24}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Dish
        </Button>
        <div className="text-lg font-semibold text-foreground">
          Total Trays: {totalTrays} / 24
        </div>
      </div>

      {/* Packing Information */}
      

      <Button
        onClick={handleNext}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={totalTrays === 0}
      >
        Next: Select Date
      </Button>
    </div>
  );
};
