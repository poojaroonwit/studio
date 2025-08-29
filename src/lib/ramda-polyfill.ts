// Ramda polyfill for commonly used functions
// This prevents R.filter errors from third-party libraries that expect Ramda to be available

export const R = {
  // Array functions
  filter: <T>(predicate: (item: T, index: number, array: T[]) => boolean, list: T[]): T[] => {
    if (!Array.isArray(list)) return [];
    return list.filter(predicate);
  },
  
  map: <T, U>(fn: (item: T, index: number, array: T[]) => U, list: T[]): U[] => {
    if (!Array.isArray(list)) return [];
    return list.map(fn);
  },
  
  reduce: <T, U>(fn: (acc: U, item: T, index: number, array: T[]) => U, initial: U, list: T[]): U => {
    if (!Array.isArray(list)) return initial;
    return list.reduce(fn, initial);
  },
  
  find: <T>(predicate: (item: T, index: number, array: T[]) => boolean, list: T[]): T | undefined => {
    if (!Array.isArray(list)) return undefined;
    return list.find(predicate);
  },
  
  findIndex: <T>(predicate: (item: T, index: number, array: T[]) => boolean, list: T[]): number => {
    if (!Array.isArray(list)) return -1;
    return list.findIndex(predicate);
  },
  
  includes: <T>(item: T, list: T[]): boolean => {
    if (!Array.isArray(list)) return false;
    return list.includes(item);
  },
  
  head: <T>(list: T[]): T | undefined => {
    if (!Array.isArray(list) || list.length === 0) return undefined;
    return list[0];
  },
  
  last: <T>(list: T[]): T | undefined => {
    if (!Array.isArray(list) || list.length === 0) return undefined;
    return list[list.length - 1];
  },
  
  tail: <T>(list: T[]): T[] => {
    if (!Array.isArray(list) || list.length <= 1) return [];
    return list.slice(1);
  },
  
  init: <T>(list: T[]): T[] => {
    if (!Array.isArray(list) || list.length <= 1) return [];
    return list.slice(0, -1);
  },
  
  take: <T>(n: number, list: T[]): T[] => {
    if (!Array.isArray(list)) return [];
    return list.slice(0, n);
  },
  
  drop: <T>(n: number, list: T[]): T[] => {
    if (!Array.isArray(list)) return [];
    return list.slice(n);
  },
  
  // Object functions
  prop: <T, K extends keyof T>(key: K, obj: T): T[K] | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;
    return obj[key];
  },
  
  path: <T>(path: (string | number)[], obj: any): T | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return current[key];
      }
      return undefined;
    }, obj) as T;
  },
  
  pick: <T extends Record<string, any>, K extends keyof T>(keys: K[], obj: T): Pick<T, K> => {
    if (!obj || typeof obj !== 'object') return {} as Pick<T, K>;
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },
  
  omit: <T extends Record<string, any>, K extends keyof T>(keys: K[], obj: T): Omit<T, K> => {
    if (!obj || typeof obj !== 'object') return {} as Omit<T, K>;
    const result = { ...obj } as Omit<T, K>;
    keys.forEach(key => {
      delete (result as any)[key];
    });
    return result;
  },
  
  // Function composition
  compose: <T extends any[], R>(...fns: ((...args: any[]) => any)[]): (...args: T) => R => {
    return fns.reduce((f, g) => (...args: T) => f(g(...args))) as (...args: T) => R;
  },
  
  pipe: <T extends any[], R>(...fns: ((...args: any[]) => any)[]): (...args: T) => R => {
    return fns.reduce((f, g) => (...args: T) => g(f(...args))) as (...args: T) => R;
  },
  
  // Utility functions
  isNil: (value: any): boolean => {
    return value === null || value === undefined;
  },
  
  isEmpty: (value: any): boolean => {
    if (R.isNil(value)) return true;
    if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },
  
  // Type guards
  isArray: (value: any): value is any[] => {
    return Array.isArray(value);
  },
  
  isObject: (value: any): value is Record<string, any> => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  },
  
  isFunction: (value: any): value is Function => {
    return typeof value === 'function';
  },
  
  isString: (value: any): value is string => {
    return typeof value === 'string';
  },
  
  isNumber: (value: any): value is number => {
    return typeof value === 'number' && !isNaN(value);
  },
  
  isBoolean: (value: any): value is boolean => {
    return typeof value === 'boolean';
  }
};

// Make R available globally if needed
if (typeof window !== 'undefined') {
  (window as any).R = R;
}

export default R;
