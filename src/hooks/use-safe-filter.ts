import { useCallback, useMemo } from 'react';
import { reactSafeArray } from '@/lib/utils';
import { safeFilter as ramdaSafeFilter } from '@/lib/ramda-polyfill';

interface FilterErrorContext {
  context: string;
  arrayType: string;
  isArray: boolean;
  isNull: boolean;
  isUndefined: boolean;
  constructor?: string;
  length?: number;
  keys?: string[] | null;
  sample?: string | null;
  timestamp: string;
}

export function useSafeFilter() {
  const debugFilterError = useCallback((array: any, context: string): FilterErrorContext => {
    const debugInfo: FilterErrorContext = {
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
    return debugInfo;
  }, []);

  const safeFilter = useCallback(<T>(
    array: any, 
    predicate: (value: T, index: number, array: T[]) => boolean, 
    context: string
  ): T[] => {
    try {
      // Debug the array before filtering
      if (!Array.isArray(array)) {
        debugFilterError(array, context);
      }
      
      // Use the new safe filter utility from ramda-polyfill
      return ramdaSafeFilter(predicate, array);
    } catch (error) {
      const errorContext = debugFilterError(array, context);
      
      console.error('safeFilter error with context:', {
        ...errorContext,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Throw a more informative error for debugging
      throw new Error(
        `Filter error in ${context}: ${error instanceof Error ? error.message : String(error)}. ` +
        `Array type: ${errorContext.arrayType}, isArray: ${errorContext.isArray}, ` +
        `isNull: ${errorContext.isNull}, isUndefined: ${errorContext.isUndefined}`
      );
    }
  }, [debugFilterError]);

  const safeFilterMemo = useCallback(<T>(
    array: any, 
    predicate: (value: T, index: number, array: T[]) => boolean, 
    context: string,
    dependencies: any[] = []
  ): T[] => {
    return useMemo(() => {
      return safeFilter(array, predicate, context);
    }, [array, ...dependencies]);
  }, [safeFilter]);

  return {
    safeFilter,
    safeFilterMemo,
    debugFilterError,
  };
}
