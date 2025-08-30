import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple HTML sanitizer to prevent XSS attacks
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Remove potentially dangerous tags and attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<input\b[^>]*>/gi, '')
    .replace(/<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi, '')
    .replace(/<select\b[^<]*(?:(?!<\/select>)<[^<]*)*<\/select>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/<a\b[^>]*href\s*=\s*["'](javascript|vbscript|data):[^"']*["'][^>]*>/gi, '');
}

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
    return 'font-anuphan';
  }
  return 'font-inter';
}

// Get appropriate font family CSS value based on text content
export function getFontFamily(text: string): string {
  if (containsThaiText(text)) {
    return 'var(--font-anuphan), var(--font-inter), Arial, Helvetica, sans-serif';
  }
  return 'var(--font-inter), Arial, Helvetica, sans-serif';
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

// React-specific safe array utilities
export const reactSafeArray = {
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

  // Safe filter operation - React component safe
  filter: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T[] => {
    try {
      const safeArr = reactSafeArray.ensureArray<T>(array);
      const result = safeArr.filter(predicate);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn('reactSafeArray.filter error:', error);
      return [];
    }
  },

  // Safe map operation - React component safe
  map: <T, U>(array: any, mapper: (value: T, index: number, array: T[]) => U): U[] => {
    try {
      const safeArr = reactSafeArray.ensureArray<T>(array);
      const result = safeArr.map(mapper);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn('reactSafeArray.map error:', error);
      return [];
    }
  },

  // Safe find operation - React component safe
  find: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T | undefined => {
    try {
      const safeArr = reactSafeArray.ensureArray<T>(array);
      return safeArr.find(predicate);
    } catch (error) {
      console.warn('reactSafeArray.find error:', error);
      return undefined;
    }
  },

  // Safe some operation - React component safe
  some: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
    try {
      const safeArr = reactSafeArray.ensureArray<T>(array);
      return safeArr.some(predicate);
    } catch (error) {
      console.warn('reactSafeArray.some error:', error);
      return false;
    }
  },

  // Safe every operation - React component safe
  every: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
    try {
      const safeArr = reactSafeArray.ensureArray<T>(array);
      return safeArr.every(predicate);
    } catch (error) {
      console.warn('reactSafeArray.every error:', error);
      return true;
    }
  },

  // Safe reduce operation - React component safe
  reduce: <T, U>(array: any, reducer: (accumulator: U, value: T, index: number, array: T[]) => U, initialValue: U): U => {
    try {
      const safeArr = reactSafeArray.ensureArray<T>(array);
      return safeArr.reduce(reducer, initialValue);
    } catch (error) {
      console.warn('reactSafeArray.reduce error:', error);
      return initialValue;
    }
  },

  // Safe forEach operation - React component safe
  forEach: <T>(array: any, callback: (value: T, index: number, array: T[]) => void): void => {
    try {
      const safeArr = reactSafeArray.ensureArray<T>(array);
      safeArr.forEach(callback);
    } catch (error) {
      console.warn('reactSafeArray.forEach error:', error);
    }
  },

  // Safe slice operation - React component safe
  slice: <T>(array: any, start?: number, end?: number): T[] => {
    try {
      const safeArr = reactSafeArray.ensureArray<T>(array);
      return safeArr.slice(start, end);
    } catch (error) {
      console.warn('reactSafeArray.slice error:', error);
      return [];
    }
  },

  // Safe length check - React component safe
  length: (array: any): number => {
    try {
      const safeArr = reactSafeArray.ensureArray(array);
      return safeArr.length;
    } catch (error) {
      console.warn('reactSafeArray.length error:', error);
      return 0;
    }
  },

  // Enhanced safe filter with error context
  safeFilter: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean, context?: string): T[] => {
    try {
      const safeArr = reactSafeArray.ensureArray<T>(array);
      const result = safeArr.filter(predicate);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      const errorContext = {
        error: error instanceof Error ? error.message : String(error),
        context: context || 'unknown',
        arrayType: typeof array,
        isArray: Array.isArray(array),
        isNull: array === null,
        isUndefined: array === undefined,
        timestamp: new Date().toISOString(),
      };
      
      console.error('safeFilter error with context:', errorContext);
      console.error('Original error:', error);
      
      // Throw a more informative error for debugging
      throw new Error(`Filter error in ${context || 'unknown context'}: ${error instanceof Error ? error.message : String(error)}. Array type: ${typeof array}, isArray: ${Array.isArray(array)}`);
    }
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
      const safeArr = reactSafeArray.ensureArray<T>(array);
      return safeArr.includes(searchElement, fromIndex);
    } catch (error) {
      console.warn('reactSafeArray.includes error:', error);
      return false;
    }
  },

  // Safe indexOf check - React component safe
  indexOf: <T>(array: any, searchElement: T, fromIndex?: number): number => {
    try {
      const safeArr = reactSafeArray.ensureArray<T>(array);
      return safeArr.indexOf(searchElement, fromIndex);
    } catch (error) {
      console.warn('reactSafeArray.indexOf error:', error);
      return -1;
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
