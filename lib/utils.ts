import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Fee constants
export const DEFAULT_PLATFORM_FEE_BPS = 500; // 5%
export const DEFAULT_COMMUNITY_FEE_BPS = 1000; // 10%
export const MAX_TOTAL_FEE_BPS = 5000; // 50%

// Format cents to dollars
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Format units to hours
export function formatUnitsToHours(units: number): string {
  const hours = Math.floor(units / 60);
  const minutes = units % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// Format date time
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString();
}
