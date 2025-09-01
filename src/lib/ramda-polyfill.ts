// Ramda polyfill utility to prevent "R.filter is not a function" errors
// This provides safe fallbacks for common Ramda functions used in the application

declare global {
  interface Window {
    R: {
      filter?: (predicate: any, list: any) => any[];
      map?: (fn: any, list: any) => any[];
      find?: (predicate: any, list: any) => any;
      prop?: (prop: string, obj: any) => any;
      path?: (path: string[], obj: any) => any;
      compose?: (...fns: any[]) => any;
      pipe?: (...fns: any[]) => any;
      curry?: (fn: any) => any;
      [key: string]: any;
    };
  }
}

// Safe array check utility
function ensureArray(value: any): any[] {
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
}

// Safe object check utility
function ensureObject(value: any): any {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return {};
}

// Core Ramda polyfill functions
const ramdaPolyfill = {
  // Safe filter function
  filter: (predicate: any, list: any): any[] => {
    try {
      const safeList = ensureArray(list);
      if (typeof predicate !== 'function') {
        console.warn('R.filter: predicate is not a function, returning original array');
        return safeList;
      }
      return safeList.filter(predicate);
    } catch (error) {
      console.warn('R.filter: error during filtering, returning empty array:', error);
      return [];
    }
  },

  // Safe map function
  map: (fn: any, list: any): any[] => {
    try {
      const safeList = ensureArray(list);
      if (typeof fn !== 'function') {
        console.warn('R.map: mapper is not a function, returning original array');
        return safeList;
      }
      return safeList.map(fn);
    } catch (error) {
      console.warn('R.map: error during mapping, returning empty array:', error);
      return [];
    }
  },

  // Safe find function
  find: (predicate: any, list: any): any => {
    try {
      const safeList = ensureArray(list);
      if (typeof predicate !== 'function') {
        console.warn('R.find: predicate is not a function, returning undefined');
        return undefined;
      }
      return safeList.find(predicate);
    } catch (error) {
      console.warn('R.find: error during finding, returning undefined:', error);
      return undefined;
    }
  },

  // Safe prop function
  prop: (prop: string, obj: any): any => {
    try {
      const safeObj = ensureObject(obj);
      return safeObj[prop];
    } catch (error) {
      console.warn('R.prop: error accessing property, returning undefined:', error);
      return undefined;
    }
  },

  // Safe path function
  path: (path: string[], obj: any): any => {
    try {
      if (!Array.isArray(path) || !obj) {
        return undefined;
      }
      return path.reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
      }, obj);
    } catch (error) {
      console.warn('R.path: error accessing path, returning undefined:', error);
      return undefined;
    }
  },

  // Safe compose function
  compose: (...fns: any[]): any => {
    try {
      const validFns = fns.filter(fn => typeof fn === 'function');
      if (validFns.length === 0) {
        return (x: any) => x;
      }
      return (x: any) => validFns.reduceRight((acc, fn) => fn(acc), x);
    } catch (error) {
      console.warn('R.compose: error creating composition, returning identity function:', error);
      return (x: any) => x;
    }
  },

  // Safe pipe function
  pipe: (...fns: any[]): any => {
    try {
      const validFns = fns.filter(fn => typeof fn === 'function');
      if (validFns.length === 0) {
        return (x: any) => x;
      }
      return (x: any) => validFns.reduce((acc, fn) => fn(acc), x);
    } catch (error) {
      console.warn('R.pipe: error creating pipe, returning identity function:', error);
      return (x: any) => x;
    }
  },

  // Safe curry function
  curry: (fn: any): any => {
    try {
      if (typeof fn !== 'function') {
        console.warn('R.curry: argument is not a function, returning identity function');
        return (x: any) => x;
      }
      
      const arity = fn.length;
      return function curried(...args: any[]) {
        if (args.length >= arity) {
          return fn.apply(this, args);
        }
        return function(...moreArgs: any[]) {
          return curried.apply(this, args.concat(moreArgs));
        };
      };
    } catch (error) {
      console.warn('R.curry: error creating curried function, returning identity function:', error);
      return (x: any) => x;
    }
  },

  // Safe reduce function
  reduce: (fn: any, initial: any, list: any): any => {
    try {
      const safeList = ensureArray(list);
      if (typeof fn !== 'function') {
        console.warn('R.reduce: reducer is not a function, returning initial value');
        return initial;
      }
      return safeList.reduce(fn, initial);
    } catch (error) {
      console.warn('R.reduce: error during reduction, returning initial value:', error);
      return initial;
    }
  },

  // Safe some function
  some: (predicate: any, list: any): boolean => {
    try {
      const safeList = ensureArray(list);
      if (typeof predicate !== 'function') {
        console.warn('R.some: predicate is not a function, returning false');
        return false;
      }
      return safeList.some(predicate);
    } catch (error) {
      console.warn('R.some: error during some check, returning false:', error);
      return false;
    }
  },

  // Safe every function
  every: (predicate: any, list: any): boolean => {
    try {
      const safeList = ensureArray(list);
      if (typeof predicate !== 'function') {
        console.warn('R.every: predicate is not a function, returning true');
        return true;
      }
      return safeList.every(predicate);
    } catch (error) {
      console.warn('R.every: error during every check, returning true:', error);
      return true;
    }
  },

  // Safe flatten function
  flatten: (list: any): any[] => {
    try {
      const safeList = ensureArray(list);
      return safeList.flat(Infinity);
    } catch (error) {
      console.warn('R.flatten: error during flattening, returning empty array:', error);
      return [];
    }
  },

  // Safe uniq function
  uniq: (list: any): any[] => {
    try {
      const safeList = ensureArray(list);
      return [...new Set(safeList)];
    } catch (error) {
      console.warn('R.uniq: error during deduplication, returning empty array:', error);
      return [];
    }
  },

  // Safe sort function
  sort: (comparator: any, list: any): any[] => {
    try {
      const safeList = ensureArray(list);
      if (typeof comparator !== 'function') {
        console.warn('R.sort: comparator is not a function, returning sorted array with default comparator');
        return [...safeList].sort();
      }
      return [...safeList].sort(comparator);
    } catch (error) {
      console.warn('R.sort: error during sorting, returning original array:', error);
      return safeList;
    }
  }
};

// Initialize the polyfill
export function initializeRamdaPolyfill(): void {
  if (typeof window !== 'undefined') {
    // Create R object if it doesn't exist
    if (!window.R) {
      window.R = {};
    }

    // Apply polyfill functions only if they don't already exist or are not functions
    Object.entries(ramdaPolyfill).forEach(([key, implementation]) => {
      if (typeof window.R[key] !== 'function') {
        window.R[key] = implementation;
      }
    });
  }
}

// Export individual functions for direct use
export const R = ramdaPolyfill;

// Export a safe wrapper for R.filter specifically
export function safeFilter<T>(
  predicate: (value: T, index: number, array: T[]) => boolean,
  list: any
): T[] {
  return ramdaPolyfill.filter(predicate, list);
}

// Export a safe wrapper for R.map specifically
export function safeMap<T, U>(
  fn: (value: T, index: number, array: T[]) => U,
  list: any
): U[] {
  return ramdaPolyfill.map(fn, list);
}

// Export a safe wrapper for R.find specifically
export function safeFind<T>(
  predicate: (value: T, index: number, array: T[]) => boolean,
  list: any
): T | undefined {
  return ramdaPolyfill.find(predicate, list);
}

// Export utility functions
export { ensureArray, ensureObject };
