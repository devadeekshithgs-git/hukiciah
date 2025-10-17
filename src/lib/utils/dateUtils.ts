import { HOLIDAYS_2025 } from '../constants';

export const isSunday = (date: Date): boolean => {
  return date.getDay() === 0;
};

export const isSaturday = (date: Date): boolean => {
  return date.getDay() === 6;
};

export const isHoliday = (date: Date): boolean => {
  const dateString = date.toISOString().split('T')[0];
  return HOLIDAYS_2025.includes(dateString);
};

export const isDateBlocked = (date: Date): boolean => {
  return isSunday(date) || isHoliday(date);
};

export const getGreeting = (name: string): string => {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning ${name}`;
  if (hour < 17) return `Good afternoon ${name}`;
  if (hour < 21) return `Good evening ${name}`;
  return `Good night ${name}`;
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
