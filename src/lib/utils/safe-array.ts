/**
 * Safe Array Utilities
 * Utility functions for safely working with arrays to prevent runtime errors
 */

// Ramda-based safe array utilities with try-catch for React component safety
const ramdaEnsureArray = <T>(value: any): T[] => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (typeof value === 'object' && value.length !== undefined) {
    return Array.from(value);
  }
  return [];
};

const ramdaSafeFilter = <T>(predicate: (value: T, index: number, array: T[]) => boolean, array: any): T[] => {
  try {
    const safeArr = ramdaEnsureArray<T>(array);
    return safeArr.filter(predicate);
  } catch (error) {
    console.warn('ramdaSafeFilter error:', error);
    return [];
  }
};

const ramdaSafeMap = <T, U>(mapper: (value: T, index: number, array: T[]) => U, array: any): U[] => {
  try {
    const safeArr = ramdaEnsureArray<T>(array);
    return safeArr.map(mapper);
  } catch (error) {
    console.warn('ramdaSafeMap error:', error);
    return [];
  }
};

const ramdaSafeFind = <T>(predicate: (value: T, index: number, array: T[]) => boolean, array: any): T | undefined => {
  try {
    const safeArr = ramdaEnsureArray<T>(array);
    return safeArr.find(predicate);
  } catch (error) {
    console.warn('ramdaSafeFind error:', error);
    return undefined;
  }
};

/**
 * React-specific safe array utilities with enhanced error handling
 */
export const reactSafeArray = {
  filter: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T[] => {
    return ramdaSafeFilter(predicate, array);
  },

  map: <T, U>(array: any, mapper: (value: T, index: number, array: T[]) => U): U[] => {
    return ramdaSafeMap(mapper, array);
  },

  find: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T | undefined => {
    return ramdaSafeFind(predicate, array);
  },

  some: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
    try {
      const safeArr = ramdaEnsureArray<T>(array);
      return safeArr.some(predicate);
    } catch (error) {
      console.warn('reactSafeArray.some error:', error);
      return false;
    }
  },

  every: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
    try {
      const safeArr = ramdaEnsureArray<T>(array);
      return safeArr.every(predicate);
    } catch (error) {
      console.warn('reactSafeArray.every error:', error);
      return true;
    }
  },

  length: <T>(array: any): number => {
    try {
      const safeArr = ramdaEnsureArray(array);
      return safeArr.length;
    } catch (error) {
      console.warn('reactSafeArray.length error:', error);
      return 0;
    }
  },

  safeFilter: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean, context?: string): T[] => {
    return ramdaSafeFilter(predicate, array);
  },

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

  includes: <T>(array: any, searchElement: T, fromIndex?: number): boolean => {
    try {
      const safeArr = ramdaEnsureArray<T>(array);
      return safeArr.includes(searchElement, fromIndex);
    } catch (error) {
      console.warn('reactSafeArray.includes error:', error);
      return false;
    }
  },

  indexOf: <T>(array: any, searchElement: T, fromIndex?: number): number => {
    try {
      const safeArr = ramdaEnsureArray<T>(array);
      return safeArr.indexOf(searchElement, fromIndex);
    } catch (error) {
      console.warn('reactSafeArray.indexOf error:', error);
      return -1;
    }
  },

  reduce: <T, U>(array: any, reducer: (accumulator: U, value: T, index: number, array: T[]) => U, initialValue: U): U => {
    try {
      const safeArr = ramdaEnsureArray<T>(array);
      return safeArr.reduce(reducer, initialValue);
    } catch (error) {
      console.warn('reactSafeArray.reduce error:', error);
      return initialValue;
    }
  },

  forEach: <T>(array: any, callback: (value: T, index: number, array: T[]) => void): void => {
    try {
      const safeArr = ramdaEnsureArray<T>(array);
      safeArr.forEach(callback);
    } catch (error) {
      console.warn('reactSafeArray.forEach error:', error);
    }
  },

  slice: <T>(array: any, start?: number, end?: number): T[] => {
    try {
      const safeArr = ramdaEnsureArray<T>(array);
      return safeArr.slice(start, end);
    } catch (error) {
      console.warn('reactSafeArray.slice error:', error);
      return [];
    }
  }
};

/**
 * General safe array utilities
 */
export const safeArrayUtils = {
  ensureArray: <T>(value: any): T[] => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    if (typeof value === 'object' && value.length !== undefined) {
      return Array.from(value);
    }
    return [];
  },

  filter: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T[] => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      return safeArr.filter(predicate);
    } catch (error) {
      console.warn('safeArrayUtils.filter error:', error);
      return [];
    }
  },

  map: <T, U>(array: any, mapper: (value: T, index: number, array: T[]) => U): U[] => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      return safeArr.map(mapper);
    } catch (error) {
      console.warn('safeArrayUtils.map error:', error);
      return [];
    }
  },

  find: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): T | undefined => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      return safeArr.find(predicate);
    } catch (error) {
      console.warn('safeArrayUtils.find error:', error);
      return undefined;
    }
  },

  some: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      return safeArr.some(predicate);
    } catch (error) {
      console.warn('safeArrayUtils.some error:', error);
      return false;
    }
  },

  every: <T>(array: any, predicate: (value: T, index: number, array: T[]) => boolean): boolean => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      return safeArr.every(predicate);
    } catch (error) {
      console.warn('safeArrayUtils.every error:', error);
      return true;
    }
  },

  reduce: <T, U>(array: any, reducer: (accumulator: U, value: T, index: number, array: T[]) => U, initialValue: U): U => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      return safeArr.reduce(reducer, initialValue);
    } catch (error) {
      console.warn('safeArrayUtils.reduce error:', error);
      return initialValue;
    }
  },

  forEach: <T>(array: any, callback: (value: T, index: number, array: T[]) => void): void => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      safeArr.forEach(callback);
    } catch (error) {
      console.warn('safeArrayUtils.forEach error:', error);
    }
  },

  slice: <T>(array: any, start?: number, end?: number): T[] => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      return safeArr.slice(start, end);
    } catch (error) {
      console.warn('safeArrayUtils.slice error:', error);
      return [];
    }
  },

  length: (array: any): number => {
    try {
      const safeArr = safeArrayUtils.ensureArray(array);
      return safeArr.length;
    } catch (error) {
      console.warn('safeArrayUtils.length error:', error);
      return 0;
    }
  },

  includes: <T>(array: any, searchElement: T, fromIndex?: number): boolean => {
    try {
      const safeArr = safeArrayUtils.ensureArray<T>(array);
      return safeArr.includes(searchElement, fromIndex);
    } catch (error) {
      console.warn('safeArrayUtils.includes error:', error);
      return false;
    }
  },

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
