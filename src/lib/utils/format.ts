/**
 * Formatting Utilities
 * Functions for formatting dates, file sizes, and other display values
 */

import { format } from "date-fns";

/**
 * Format file size from bytes to human readable string
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
    return 'Unknown size';
  }
  
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeIndex = Math.max(0, Math.min(i, sizes.length - 1));
  
  return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
}

/**
 * Format date to localized string
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return '-';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return '-';
  }
}

/**
 * Format date and time to localized string
 */
export function formatDateTime(date: string | Date | null): string {
  if (!date) return '-';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '-';
  }
}

/**
 * Validates if a value is a valid Date object
 */
export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Safely converts a value to a Date object
 */
export function safeToDate(value: any): Date | null {
  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }
  
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }
  
  return null;
}

/**
 * Safely gets a Date object from a date range property
 */
export function safeGetDateFromRange(dateRange: any, property: 'from' | 'to'): Date | null {
  if (!dateRange || typeof dateRange !== 'object') {
    return null;
  }
  
  const value = dateRange[property];
  return safeToDate(value);
}

/**
 * Safely formats a date with fallback
 */
export function safeFormatDate(date: any, formatStr: string, fallback: string = '-'): string {
  const dateObj = safeToDate(date);
  if (!dateObj) {
    return fallback;
  }
  
  try {
    return format(dateObj, formatStr);
  } catch (error) {
    console.warn('safeFormatDate: Error formatting date', { date, formatStr, error });
    return fallback;
  }
}

/**
 * Safely calls getTime() on a date with fallback
 */
export function safeGetTimeWithFallback(date: any, fallback: number = 0): number {
  const dateObj = safeToDate(date);
  if (!dateObj) {
    return fallback;
  }
  
  try {
    return dateObj.getTime();
  } catch (error) {
    console.warn('safeGetTimeWithFallback: Error getting time', { date, error });
    return fallback;
  }
}

/**
 * Safely gets the time value from a date, with fallback
 */
export function safeGetTime(date: any, fallback: number = 0): number {
  if (!isValidDate(date)) {
    console.warn('safeGetTime: Invalid date provided', date);
    return fallback;
  }
  return date.getTime();
}

/**
 * Safely calculates the difference between two dates in milliseconds
 */
export function safeDateDiff(startDate: any, endDate: any, fallback: number = 0): number {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    console.warn('safeDateDiff: Invalid dates provided', { startDate, endDate });
    return fallback;
  }
  return endDate.getTime() - startDate.getTime();
}

/**
 * Safely compares two dates for sorting purposes
 */
export function safeDateCompare(dateA: any, dateB: any, sortDesc: boolean = true): number {
  const parsedDateA = safeToDate(dateA);
  const parsedDateB = safeToDate(dateB);
  
  if (!parsedDateA || !parsedDateB) {
    return 0;
  }
  
  const diff = parsedDateA.getTime() - parsedDateB.getTime();
  return sortDesc ? -diff : diff;
}
