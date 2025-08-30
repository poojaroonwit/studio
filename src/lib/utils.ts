import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Immediate initialization of T object to prevent T.filter errors
if (typeof window !== 'undefined') {
  // Create safe array utility function
  const safeArray = (array: any) => {
    if (Array.isArray(array)) return array;
    if (array === null || array === undefined) return [];
    if (typeof array === 'object' && array !== null) {
      try {
        return Array.from(array);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Create robust filter function
  const createSafeFilter = () => (array: any, predicate: any) => {
    const safeArr = safeArray(array);
    try {
      return safeArr.filter(predicate);
    } catch (error) {
      console.warn('T.filter error:', error);
      return [];
    }
  };

  // Initialize T object immediately
  if (!(window as any).T) {
    (window as any).T = {};
  }
  (window as any).T.filter = (window as any).T.filter || createSafeFilter();
  (window as any).T.map = (window as any).T.map || ((array: any, mapper: any) => {
    const safeArr = safeArray(array);
    try {
      return safeArr.map(mapper);
    } catch (error) {
      console.warn('T.map error:', error);
      return [];
    }
  });
  (window as any).T.find = (window as any).T.find || ((array: any, predicate: any) => {
    const safeArr = safeArray(array);
    try {
      return safeArr.find(predicate);
    } catch (error) {
      console.warn('T.find error:', error);
      return undefined;
    }
  });
  (window as any).T.reduce = (window as any).T.reduce || ((array: any, reducer: any, initialValue: any) => {
    const safeArr = safeArray(array);
    try {
      return safeArr.reduce(reducer, initialValue);
    } catch (error) {
      console.warn('T.reduce error:', error);
      return initialValue;
    }
  });
  (window as any).T.forEach = (window as any).T.forEach || ((array: any, callback: any) => {
    const safeArr = safeArray(array);
    try {
      return safeArr.forEach(callback);
    } catch (error) {
      console.warn('T.forEach error:', error);
    }
  });
  (window as any).T.every = (window as any).T.every || ((array: any, predicate: any) => {
    const safeArr = safeArray(array);
    try {
      return safeArr.every(predicate);
    } catch (error) {
      console.warn('T.every error:', error);
      return true;
    }
  });

  console.log('✅ T object initialized immediately in utils.ts');
}

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
 * Safely executes forEach on a value, ensuring it's an array first
 * This helps prevent "forEach is not a function" errors
 */
export function safeForEach<T>(
  value: T[] | null | undefined, 
  callback: (item: T, index: number, array: T[]) => void
): void {
  const array = ensureArray(value);
  array.forEach(callback);
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

// Safe array utilities to prevent "filter is not a function" errors
export function safeArray<T>(input: any): T[] {
  return Array.isArray(input) ? input : [];
}

export function safeFilter<T>(
  array: any, 
  predicate: (value: T, index: number, array: T[]) => boolean
): T[] {
  const safeArrayValue = safeArray<T>(array);
  return safeArrayValue.filter(predicate);
}

export function safeMap<T, U>(
  array: any, 
  mapper: (value: T, index: number, array: T[]) => U
): U[] {
  const safeArrayValue = safeArray<T>(array);
  return safeArrayValue.map(mapper);
}

export function safeFind<T>(
  array: any, 
  predicate: (value: T, index: number, array: T[]) => boolean
): T | undefined {
  const safeArrayValue = safeArray<T>(array);
  return safeArrayValue.find(predicate);
}

export function safeSome<T>(
  array: any, 
  predicate: (value: T, index: number, array: T[]) => boolean
): boolean {
  const safeArrayValue = safeArray<T>(array);
  return safeArrayValue.some(predicate);
}

export function safeEvery<T>(
  array: any, 
  predicate: (value: T, index: number, array: T[]) => boolean
): boolean {
  const safeArrayValue = safeArray<T>(array);
  return safeArrayValue.every(predicate);
}

export function safeLength(array: any): number {
  return Array.isArray(array) ? array.length : 0;
}

export function safeSlice<T>(
  array: any, 
  start?: number, 
  end?: number
): T[] {
  const safeArrayValue = safeArray<T>(array);
  return safeArrayValue.slice(start, end);
}

// Export a safe R utility that can be used throughout the application
export const safeR = {
  filter: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T[] => {
    if (typeof window !== 'undefined' && (window as any).R && typeof (window as any).R.filter === 'function') {
      return (window as any).R.filter(array, predicate);
    }
    // Fallback to safe array utilities
    return safeFilter(array, predicate);
  },
  
  map: <T, U>(array: any, mapper: (value: T, index: number, array: T[]) => U): U[] => {
    if (typeof window !== 'undefined' && (window as any).R && typeof (window as any).R.map === 'function') {
      return (window as any).R.map(array, mapper);
    }
    // Fallback to safe array utilities
    return safeMap(array, mapper);
  },
  
  find: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T | undefined => {
    if (typeof window !== 'undefined' && (window as any).R && typeof (window as any).R.find === 'function') {
      return (window as any).R.find(array, predicate);
    }
    // Fallback to safe array utilities
    return safeFind(array, predicate);
  },
  
  some: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
    if (typeof window !== 'undefined' && (window as any).R && typeof (window as any).R.some === 'function') {
      return (window as any).R.some(array, predicate);
    }
    // Fallback to safe array utilities
    return safeSome(array, predicate);
  },
  
  every: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
    if (typeof window !== 'undefined' && (window as any).R && typeof (window as any).R.every === 'function') {
      return (window as any).R.every(array, predicate);
    }
    // Fallback to safe array utilities
    return safeEvery(array, predicate);
  }
};

// Initialize global R object if it doesn't exist
if (typeof window !== 'undefined') {
  // Create a more robust R object with better error handling
  const createRobustR = () => {
    const safeArray = (array: any) => {
      if (Array.isArray(array)) return array;
      if (array === null || array === undefined) return [];
      if (typeof array === 'object' && array !== null) {
        // Try to convert array-like objects
        try {
          return Array.from(array);
        } catch {
          return [];
        }
      }
      return [];
    };

    return {
      filter: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T[] => {
        try {
          const safeArr = safeArray(array);
          if (!Array.isArray(safeArr)) {
            console.warn('safeR.filter: Input could not be converted to array:', array);
            return [];
          }
          const result = safeArr.filter(predicate);
          if (!Array.isArray(result)) {
            console.warn('safeR.filter: Predicate returned non-array result:', result);
            return [];
          }
          return result;
        } catch (error) {
          console.error('safeR.filter: Error during filtering:', error);
          return [];
        }
      },
      
      map: <T, U>(array: any, mapper: (value: T, index: number, array: T[]) => U): U[] => {
        try {
          const safeArr = safeArray(array);
          if (!Array.isArray(safeArr)) {
            console.warn('safeR.map: Input could not be converted to array:', array);
            return [];
          }
          const result = safeArr.map(mapper);
          if (!Array.isArray(result)) {
            console.warn('safeR.map: Mapper returned non-array result:', result);
            return [];
          }
          return result;
        } catch (error) {
          console.error('safeR.map: Error during mapping:', error);
          return [];
        }
      },
      
      find: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T | undefined => {
        try {
          const safeArr = safeArray(array);
          if (!Array.isArray(safeArr)) {
            console.warn('safeR.find: Input could not be converted to array:', array);
            return undefined;
          }
          return safeArr.find(predicate);
        } catch (error) {
          console.error('safeR.find: Error during finding:', error);
          return undefined;
        }
      },
      
      some: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
        try {
          const safeArr = safeArray(array);
          if (!Array.isArray(safeArr)) {
            console.warn('safeR.some: Input could not be converted to array:', array);
            return false;
          }
          return safeArr.some(predicate);
        } catch (error) {
          console.error('safeR.some: Error during some check:', error);
          return false;
        }
      },
      
      every: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
        try {
          const safeArr = safeArray(array);
          if (!Array.isArray(safeArr)) {
            console.warn('safeR.every: Input could not be converted to array:', array);
            return true;
          }
          return safeArr.every(predicate);
        } catch (error) {
          console.error('safeR.every: Error during every check:', error);
          return true;
        }
      },
      
      reduce: <T, U>(array: any, reducer: (accumulator: U, value: T, index: number, array: T[]) => U, initialValue: U): U => {
        try {
          const safeArr = safeArray(array);
          if (!Array.isArray(safeArr)) {
            console.warn('safeR.reduce: Input could not be converted to array:', array);
            return initialValue;
          }
          return safeArr.reduce(reducer, initialValue);
        } catch (error) {
          console.error('safeR.reduce: Error during reduction:', error);
          return initialValue;
        }
      },
      
      forEach: <T>(array: any, callback: (value: T, index: number, array: T[]) => void): void => {
        try {
          const safeArr = safeArray(array);
          if (!Array.isArray(safeArr)) {
            console.warn('safeR.forEach: Input could not be converted to array:', array);
            return;
          }
          safeArr.forEach(callback);
        } catch (error) {
          console.error('safeR.forEach: Error during forEach:', error);
        }
      }
    };
  };

  // Initialize or update the global R object
  if (!(window as any).R) {
    (window as any).R = createRobustR();
    console.log('R object initialized successfully');
  } else {
    // Ensure all methods exist on the global R object
    const robustR = createRobustR();
    Object.keys(robustR).forEach(key => {
      if (!(window as any).R[key] || typeof (window as any).R[key] !== 'function') {
        (window as any).R[key] = (robustR as any)[key];
        console.log(`R.${key} method updated`);
      }
    });
  }

  // Initialize or update the global T object
  if (!(window as any).T) {
    (window as any).T = createRobustR();
    console.log('T object initialized successfully');
  } else {
    // Ensure all methods exist on the global T object
    const robustT = createRobustR();
    Object.keys(robustT).forEach(key => {
      if (!(window as any).T[key] || typeof (window as any).T[key] !== 'function') {
        (window as any).T[key] = (robustT as any)[key];
        console.log(`T.${key} method updated`);
      }
    });
  }

  // Add a fallback mechanism for any missing methods
  const ensureRMethods = () => {
    if (!(window as any).R) {
      (window as any).R = createRobustR();
      console.log('R object re-initialized due to missing object');
    }
    
    const requiredMethods = ['filter', 'map', 'find', 'some', 'every', 'reduce', 'forEach'];
    const robustR = createRobustR();
    
    requiredMethods.forEach(method => {
      if (!(window as any).R[method] || typeof (window as any).R[method] !== 'function') {
        (window as any).R[method] = (robustR as any)[method];
        console.log(`R.${method} method restored`);
      }
    });
  };

  const ensureTMethods = () => {
    if (!(window as any).T) {
      (window as any).T = createRobustR();
      console.log('T object re-initialized due to missing object');
    }
    
    const requiredMethods = ['filter', 'map', 'find', 'some', 'every', 'reduce', 'forEach'];
    const robustT = createRobustR();
    
    requiredMethods.forEach(method => {
      if (!(window as any).T[method] || typeof (window as any).T[method] !== 'function') {
        (window as any).T[method] = (robustT as any)[method];
        console.log(`T.${method} method restored`);
      }
    });
  };

  // Ensure R and T methods are available after a short delay
  setTimeout(() => {
    ensureRMethods();
    ensureTMethods();
  }, 100);
  
  // Also ensure R and T methods are available when the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureRMethods();
      ensureTMethods();
    });
  } else {
    ensureRMethods();
    ensureTMethods();
  }
}
