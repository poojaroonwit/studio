import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export DOMPurify-based sanitizer from security.ts for consistency
// This ensures all HTML sanitization uses the same secure implementation
export { sanitizeHtml } from '@/lib/security';

// Thai text detection utility
export function containsThaiText(text: string): boolean {
  if (!text) return false;
  
  // Thai Unicode range: \u0E00-\u0E7F
  const thaiRegex = /[\u0E00-\u0E7F]/;
  return thaiRegex.test(text);
}

// Get appropriate font class based on text content
export function getFontClass(text: string, defaultClass: string = 'font-sans'): string {
  if (containsThaiText(text)) {
    return 'font-ibm-plex-sans-thai';
  }
  return 'font-inter';
}

// Get appropriate font family CSS value based on text content
export function getFontFamily(text: string): string {
  if (containsThaiText(text)) {
    return 'var(--font-family-primary)';
  }
  return 'var(--font-family-secondary)';
}

/**
 * Safely ensures a value is an array, returning an empty array if it's not
 * This helps prevent "forEach is not a function" errors
 */
export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Safely parses JSON string or returns a default value if parsing fails
 * @param jsonString - The JSON string to parse
 * @param defaultValue - The default value to return if parsing fails
 * @returns The parsed object or the default value
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) {
    return defaultValue;
  }
  
  try {
    if (typeof jsonString === 'string') {
      return JSON.parse(jsonString);
    } else if (typeof jsonString === 'object') {
      return jsonString as T;
    }
    return defaultValue;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    console.error('Raw JSON string:', jsonString);
    return defaultValue;
  }
}

export { formatScoreWithGrade } from './scoreUtils';

// File size formatting utility
export function formatFileSize(bytes: number | null | undefined): string {
  // Handle null, undefined, NaN, or negative values
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
    return 'Unknown size';
  }
  
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // Ensure i is within bounds
  const sizeIndex = Math.max(0, Math.min(i, sizes.length - 1));
  
  return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
}

// Date and time utilities
export function formatDate(date: string | Date | null): string {
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
 * Safely validates if a value is a valid Date object
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
 * Returns -1, 0, or 1 for proper sorting
 */
export function safeDateCompare(dateA: any, dateB: any, sortDesc: boolean = true): number {
  const parsedDateA = safeToDate(dateA);
  const parsedDateB = safeToDate(dateB);
  
  if (!parsedDateA || !parsedDateB) {
    return 0; // Treat invalid dates as equal
  }
  
  const timeA = parsedDateA.getTime();
  const timeB = parsedDateB.getTime();
  
  if (timeA === timeB) return 0;
  return sortDesc ? (timeB - timeA) : (timeA - timeB);
}

/**
 * Safely sorts an array of objects by a date field
 */
export function safeSortByDate<T>(
  array: T[], 
  dateField: keyof T, 
  sortDesc: boolean = true
): T[] {
  return [...array].sort((a, b) => {
    const dateA = a[dateField];
    const dateB = b[dateField];
    return safeDateCompare(dateA, dateB, sortDesc);
  });
}

export function calculateDuration(startDate: string | Date | null, endDate: string | Date | null): string {
  if (!startDate || !endDate) return '-';
  
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    // Use safe date operations
    const diffMs = safeDateDiff(start, end);
    if (diffMs === 0) return '-'; // Invalid dates
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return '< 1m';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return '-';
  }
}

import { safeFilter as ramdaSafeFilter, safeMap as ramdaSafeMap, safeFind as ramdaSafeFind, ensureArray as ramdaEnsureArray } from './ramda-polyfill';

// React-specific safe array utilities
export const reactSafeArray = {
  // Safely ensure a value is an array
  ensureArray: <T>(value: any): T[] => {
    return ramdaEnsureArray(value);
  },

  // Safe filter operation - React component safe
  filter: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T[] => {
    return ramdaSafeFilter(predicate, array);
  },

  // Safe map operation - React component safe
  map: <T, U>(array: any, mapper: (value: T, index: number, array: T[]) => U): U[] => {
    return ramdaSafeMap(mapper, array);
  },

  // Safe find operation - React component safe
  find: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T | undefined => {
    return ramdaSafeFind(predicate, array);
  },

  // Safe some operation - React component safe
  some: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
    try {
      const safeArr = ramdaEnsureArray(array);
      return safeArr.some(predicate);
    } catch (error) {
      console.warn('reactSafeArray.some error:', error);
      return false;
    }
  },

  // Safe every operation - React component safe
  every: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
    try {
      const safeArr = ramdaEnsureArray(array);
      return safeArr.every(predicate);
    } catch (error) {
      console.warn('reactSafeArray.every error:', error);
      return true;
    }
  },

  // Safe length operation - React component safe
  length: <T>(array: any): number => {
    try {
      const safeArr = ramdaEnsureArray(array);
      return safeArr.length;
    } catch (error) {
      console.warn('reactSafeArray.length error:', error);
      return 0;
    }
  },

  // Enhanced safe filter with error context
  safeFilter: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean, context?: string): T[] => {
    return ramdaSafeFilter(predicate, array);
  },

  // Debug utility to identify filter error sources
  debugFilterError: (array: any, context: string): void => {
    const debugInfo = {
      context,
      arrayType: typeof array,
      isArray: Array.isArray(array),
      isNull: array === null,
      isUndefined: array === undefined,
      constructor: array?.constructor?.name,
      length: array?.length,
      keys: array && typeof array === 'object' ? Object.keys(array) : null,
      sample: array && typeof array === 'object' ? JSON.stringify(array).substring(0, 200) + '...' : null,
      timestamp: new Date().toISOString(),
    };
    
    console.warn('Filter error debug info:', debugInfo);
  },

  // Safe includes check - React component safe
  includes: <T>(array: any, searchElement: T, fromIndex?: number): boolean => {
    try {
      const safeArr = ramdaEnsureArray(array);
      return safeArr.includes(searchElement, fromIndex);
    } catch (error) {
      console.warn('reactSafeArray.includes error:', error);
      return false;
    }
  },

  // Safe indexOf check - React component safe
  indexOf: <T>(array: any, searchElement: T, fromIndex?: number): number => {
    try {
      const safeArr = ramdaEnsureArray(array);
      return safeArr.indexOf(searchElement, fromIndex);
    } catch (error) {
      console.warn('reactSafeArray.indexOf error:', error);
      return -1;
    }
  },

  // Safe reduce operation - React component safe
  reduce: <T, U>(array: any, reducer: (accumulator: U, value: T, index: number, array: T[]) => U, initialValue: U): U => {
    try {
      const safeArr = ramdaEnsureArray(array);
      return safeArr.reduce(reducer, initialValue);
    } catch (error) {
      console.warn('reactSafeArray.reduce error:', error);
      return initialValue;
    }
  },

  // Safe forEach operation - React component safe
  forEach: <T>(array: any, callback: (value: T, index: number, array: T[]) => void): void => {
    try {
      const safeArr = ramdaEnsureArray(array);
      safeArr.forEach(callback);
    } catch (error) {
      console.warn('reactSafeArray.forEach error:', error);
    }
  },

  // Safe slice operation - React component safe
  slice: <T>(array: any, start?: number, end?: number): T[] => {
    try {
      const safeArr = ramdaEnsureArray(array);
      return safeArr.slice(start, end);
    } catch (error) {
      console.warn('reactSafeArray.slice error:', error);
      return [];
    }
  }
};

// Comprehensive safe array utilities to prevent T.filter errors
export const safeArrayUtils = {
  // Safely ensure a value is an array
  ensureArray: <T>(value: any): T[] => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    if (typeof value === 'object' && value !== null) {
      try {
        return Array.from(value);
        } catch {
          return [];
        }
      }
      return [];
  },

  // Safe filter operation
      filter: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T[] => {
        try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
          const result = safeArr.filter(predicate);
      return Array.isArray(result) ? result : [];
        } catch (error) {
      console.warn('safeArrayUtils.filter error:', error);
          return [];
        }
      },
      
  // Safe map operation
      map: <T, U>(array: any, mapper: (value: T, index: number, array: T[]) => U): U[] => {
        try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
          const result = safeArr.map(mapper);
      return Array.isArray(result) ? result : [];
        } catch (error) {
      console.warn('safeArrayUtils.map error:', error);
          return [];
        }
      },
      
  // Safe find operation
      find: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T | undefined => {
        try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
          return safeArr.find(predicate);
        } catch (error) {
      console.warn('safeArrayUtils.find error:', error);
          return undefined;
        }
      },
      
  // Safe some operation
      some: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
        try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
          return safeArr.some(predicate);
        } catch (error) {
      console.warn('safeArrayUtils.some error:', error);
          return false;
        }
      },
      
  // Safe every operation
      every: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
        try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
          return safeArr.every(predicate);
        } catch (error) {
      console.warn('safeArrayUtils.every error:', error);
          return true;
        }
      },
      
  // Safe reduce operation
      reduce: <T, U>(array: any, reducer: (accumulator: U, value: T, index: number, array: T[]) => U, initialValue: U): U => {
        try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
          return safeArr.reduce(reducer, initialValue);
        } catch (error) {
      console.warn('safeArrayUtils.reduce error:', error);
          return initialValue;
        }
      },
      
  // Safe forEach operation
      forEach: <T>(array: any, callback: (value: T, index: number, array: T[]) => void): void => {
        try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
          safeArr.forEach(callback);
        } catch (error) {
      console.warn('safeArrayUtils.forEach error:', error);
    }
  },

  // Safe slice operation
  slice: <T>(array: any, start?: number, end?: number): T[] => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      return safeArr.slice(start, end);
    } catch (error) {
      console.warn('safeArrayUtils.slice error:', error);
      return [];
    }
  },

  // Safe length check
  length: (array: any): number => {
    try {
      const safeArr = safeArrayUtils.ensureArray(array);
      return safeArr.length;
    } catch (error) {
      console.warn('safeArrayUtils.length error:', error);
      return 0;
    }
  },

  // Safe includes check
  includes: <T>(array: any, searchElement: T, fromIndex?: number): boolean => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      return safeArr.includes(searchElement, fromIndex);
    } catch (error) {
      console.warn('safeArrayUtils.includes error:', error);
      return false;
    }
  },

  // Safe indexOf check
  indexOf: <T>(array: any, searchElement: T, fromIndex?: number): number => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      return safeArr.indexOf(searchElement, fromIndex);
    } catch (error) {
      console.warn('safeArrayUtils.indexOf error:', error);
      return -1;
    }
  }
};

// Export individual functions for convenience
export const safeFilter = safeArrayUtils.filter;
export const safeMap = safeArrayUtils.map;
export const safeFind = safeArrayUtils.find;
export const safeSome = safeArrayUtils.some;
export const safeEvery = safeArrayUtils.every;
export const safeReduce = safeArrayUtils.reduce;
export const safeForEach = safeArrayUtils.forEach;
export const safeSlice = safeArrayUtils.slice;
export const safeLength = safeArrayUtils.length;
export const safeIncludes = safeArrayUtils.includes;
export const safeIndexOf = safeArrayUtils.indexOf;

// React-specific exports
export const reactSafeFilter = reactSafeArray.filter;
export const reactSafeMap = reactSafeArray.map;
export const reactSafeFind = reactSafeArray.find;
export const reactSafeSome = reactSafeArray.some;
export const reactSafeEvery = reactSafeArray.every;
export const reactSafeReduce = reactSafeArray.reduce;
export const reactSafeForEach = reactSafeArray.forEach;
export const reactSafeSlice = reactSafeArray.slice;
export const reactSafeLength = reactSafeArray.length;
export const reactSafeIncludes = reactSafeArray.includes;
export const reactSafeIndexOf = reactSafeArray.indexOf;
