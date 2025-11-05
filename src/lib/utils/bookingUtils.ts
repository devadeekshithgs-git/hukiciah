import { TRAY_CAPACITY, TRAY_PRICE_LESS_THAN_6, TRAY_PRICE_6_OR_MORE, PACKING_COST_PER_PACKET } from '../constants';

export const calculateDehydrationCost = (numTrays: number): number => {
  if (numTrays < 6) {
    return numTrays * TRAY_PRICE_LESS_THAN_6;
  }
  return numTrays * TRAY_PRICE_6_OR_MORE;
};

export const calculateTotalCost = (numTrays: number, numPackets: number): number => {
  const dehydrationCost = calculateDehydrationCost(numTrays);
  const packingCost = numPackets * PACKING_COST_PER_PACKET;
  return dehydrationCost + packingCost;
};

export const findAvailableTrays = (
  bookedTrays: number[],
  requiredTrays: number
): number[] => {
  const availableTrays: number[] = [];
  
  for (let i = 1; i <= TRAY_CAPACITY; i++) {
    if (!bookedTrays.includes(i)) {
      availableTrays.push(i);
      if (availableTrays.length === requiredTrays) {
        break;
      }
    }
  }
  
  return availableTrays;
};

// Dish format types
export interface NormalizedDish {
  name: string;
  quantity: number;
  packets: number;
}

/**
 * Transforms old dish format (object) to new format (array)
 * Old format: {"idli": 2, "dosa": 3}
 * New format: [{name: "idli", quantity: 2, packets: 0}, {name: "dosa", quantity: 3, packets: 0}]
 */
export const normalizeDishes = (dishes: any): NormalizedDish[] => {
  if (!dishes) return [];
  
  // Already in new array format
  if (Array.isArray(dishes)) {
    return dishes.map(dish => ({
      name: dish.name || '',
      quantity: dish.quantity || 0,
      packets: dish.packets || 0,
    }));
  }
  
  // Old object format - convert to array
  if (typeof dishes === 'object') {
    return Object.entries(dishes).map(([name, quantity]) => ({
      name,
      quantity: typeof quantity === 'number' ? quantity : 0,
      packets: 0,
    }));
  }
  
  return [];
};
