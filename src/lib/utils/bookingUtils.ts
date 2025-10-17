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
