import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Snowflake } from 'lucide-react';
import { toast } from 'sonner';
import { VACUUM_PACKING_ITEMS, VACUUM_PACKING_PRICE, VACUUM_PACKING_PRICE_BULK, VACUUM_PACKING_BULK_THRESHOLD, FREEZE_DRIED_PANEER_PRICE_PER_GRAM } from '@/lib/constants';

interface DishSelectionProps {
  dishes: { name: string; quantity: number; packets?: number; vacuumPacking?: { enabled: boolean; packets: number } }[];
  setDishes: (dishes: { name: string; quantity: number; packets?: number; vacuumPacking?: { enabled: boolean; packets: number } }[]) => void;
  numPackets: number;
  setNumPackets: (num: number) => void;
  freezeDriedPaneer: { enabled: boolean; packets: number; gramsPerPacket: number };
  setFreezeDriedPaneer: (paneer: { enabled: boolean; packets: number; gramsPerPacket: number }) => void;
  onNext: () => void;
}

export const DishSelection = ({ dishes, setDishes, numPackets, setNumPackets, freezeDriedPaneer, setFreezeDriedPaneer, onNext }: DishSelectionProps) => {
  const totalTrays = dishes.reduce((sum, dish) => sum + (dish.quantity || 0), 0);

  // Calculate total packets from all dishes
  useEffect(() => {
    const totalPackets = dishes.reduce((sum, dish) => sum + (dish.packets || 0), 0);
    setNumPackets(totalPackets);
  }, [dishes, setNumPackets]);

  // Check if a dish is eligible for vacuum packing
  const isVacuumPackingEligible = (dishName: string): boolean => {
    const normalizedName = dishName.toLowerCase().trim();
    return VACUUM_PACKING_ITEMS.some(item => normalizedName.includes(item));
  };

  // Calculate vacuum packing price
  const getVacuumPackingPrice = (packets: number): number => {
    return packets > VACUUM_PACKING_BULK_THRESHOLD ? VACUUM_PACKING_PRICE_BULK : VACUUM_PACKING_PRICE;
  };

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

  const updateDish = (index: number, field: 'name' | 'quantity' | 'packets' | 'vacuumPacking', value: string | number | { enabled: boolean; packets: number }) => {
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
    } else if (field === 'vacuumPacking') {
      newDishes[index][field] = value as { enabled: boolean; packets: number };
    } else {
      newDishes[index][field] = value as string;
      // Reset vacuum packing if dish name changes
      if (field === 'name' && newDishes[index].vacuumPacking) {
        newDishes[index].vacuumPacking = { enabled: false, packets: 0 };
      }
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
          <div key={index} className="space-y-3 p-4 border border-border rounded-md">
            {/* Dish Name - Full width on top for mobile */}
            <div className="w-full">
              <Label htmlFor={`dish-${index}`}>Dish Name</Label>
              <Input
                id={`dish-${index}`}
                value={dish.name}
                onChange={(e) => updateDish(index, 'name', e.target.value)}
                placeholder="e.g., Paneer Gravy, Fried rice, Idly, Chutney"
                className="w-full"
              />
            </div>
            
            {/* Trays, Packets and Delete button - in a row */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
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
              <div className="flex-1">
                <Label htmlFor={`packets-${index}`} className="text-foreground font-semibold">
                  Packets
                </Label>
                <Input
                  id={`packets-${index}`}
                  type="number"
                  min="0"
                  value={dish.packets}
                  onChange={(e) => updateDish(index, 'packets', e.target.value)}
                  placeholder="₹10 per packet"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => removeDish(index)}
                disabled={dishes.length === 1}
                className="text-destructive hover:bg-destructive/10 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Vacuum Packing Option - Show only for eligible items */}
            {dish.name && isVacuumPackingEligible(dish.name) && (
              <div className="mt-3 p-3 bg-accent/20 rounded-md border border-accent">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id={`vacuum-${index}`}
                    checked={dish.vacuumPacking?.enabled || false}
                    onCheckedChange={(checked) => {
                      updateDish(index, 'vacuumPacking', {
                        enabled: checked as boolean,
                        packets: checked ? (dish.vacuumPacking?.packets || 0) : 0,
                      });
                    }}
                  />
                  <Label htmlFor={`vacuum-${index}`} className="text-sm font-medium cursor-pointer">
                    Add Vacuum Packing
                  </Label>
                </div>
                {dish.vacuumPacking?.enabled && (
                  <div className="mt-2">
                    <Label htmlFor={`vacuum-packets-${index}`} className="text-xs">
                      Number of vacuum packets
                    </Label>
                    <Input
                      id={`vacuum-packets-${index}`}
                      type="number"
                      min="1"
                      max="100"
                      value={dish.vacuumPacking.packets}
                      onChange={(e) => {
                        const packets = Number(e.target.value);
                        updateDish(index, 'vacuumPacking', {
                          enabled: true,
                          packets,
                        });
                      }}
                      placeholder="Number of packets"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      ₹{getVacuumPackingPrice(dish.vacuumPacking.packets)}/packet
                      {dish.vacuumPacking.packets > VACUUM_PACKING_BULK_THRESHOLD && ' (Bulk discount applied!)'}
                    </p>
                  </div>
                )}
              </div>
            )}
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

      {/* Freeze-Dried Paneer Section */}
      <div className="mb-6 p-4 bg-accent/10 rounded-lg border-2 border-accent">
        <div className="flex items-center gap-2 mb-3">
          <Snowflake className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Freeze-Dried Products (Optional)</h3>
        </div>
        
        <div className="mb-4 p-3 bg-background/50 rounded-md border border-border">
          <p className="text-sm text-foreground mb-2">
            <strong>💰 Pricing:</strong> ₹2 per gram
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            These do not count toward the 24-tray limit.
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Examples:</strong></p>
            <p>• 250g packet = ₹500 (250g × ₹2)</p>
            <p>• 500g packet = ₹1,000 (500g × ₹2)</p>
            <p>• 1kg (1000g) packet = ₹2,000 (1000g × ₹2)</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="freeze-dried-paneer"
            checked={freezeDriedPaneer.enabled}
            onCheckedChange={(checked) => {
              setFreezeDriedPaneer({
                enabled: checked as boolean,
                packets: checked ? freezeDriedPaneer.packets : 0,
                gramsPerPacket: checked ? freezeDriedPaneer.gramsPerPacket : 0,
              });
            }}
          />
          <Label htmlFor="freeze-dried-paneer" className="text-sm font-medium cursor-pointer">
            Add Freeze-Dried Paneer
          </Label>
        </div>

        {freezeDriedPaneer.enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paneer-packets" className="text-sm">Number of packets</Label>
                <Input
                  id="paneer-packets"
                  type="number"
                  min="1"
                  max="100"
                  value={freezeDriedPaneer.packets || ''}
                  onChange={(e) => {
                    const packets = Number(e.target.value);
                    setFreezeDriedPaneer({ ...freezeDriedPaneer, packets });
                  }}
                  placeholder="e.g., 5"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="paneer-grams" className="text-sm">Grams per packet</Label>
                <Input
                  id="paneer-grams"
                  type="number"
                  min="50"
                  max="2000"
                  step="50"
                  value={freezeDriedPaneer.gramsPerPacket || ''}
                  onChange={(e) => {
                    const grams = Number(e.target.value);
                    setFreezeDriedPaneer({ ...freezeDriedPaneer, gramsPerPacket: grams });
                  }}
                  placeholder="e.g., 250"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Cost Preview */}
            {freezeDriedPaneer.packets > 0 && freezeDriedPaneer.gramsPerPacket > 0 && (
              <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                <div className="text-sm space-y-1">
                  <p className="text-foreground">
                    <strong>Cost Calculation:</strong>
                  </p>
                  <p className="text-muted-foreground">
                    {freezeDriedPaneer.packets} packet{freezeDriedPaneer.packets > 1 ? 's' : ''} × {freezeDriedPaneer.gramsPerPacket}g × ₹2/g
                  </p>
                  <p className="text-lg font-bold text-primary">
                    Total: ₹{(freezeDriedPaneer.packets * freezeDriedPaneer.gramsPerPacket * 2).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
