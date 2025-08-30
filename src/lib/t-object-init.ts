// Global Array Objects Initialization - Import this early to ensure all global objects are available
// This file should be imported before any components that might use T.filter, D.filter, etc.

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

  // Create safe array methods
  const createSafeFilter = () => (array: any, predicate: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.filter(predicate);
    } catch (error) {
      console.error('Global filter: Error during filtering:', error);
      return [];
    }
  };

  const createSafeMap = () => (array: any, mapper: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.map(mapper);
    } catch (error) {
      console.error('Global map: Error during mapping:', error);
      return [];
    }
  };

  const createSafeFind = () => (array: any, predicate: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.find(predicate);
    } catch (error) {
      console.error('Global find: Error during finding:', error);
      return undefined;
    }
  };

  const createSafeSome = () => (array: any, predicate: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.some(predicate);
    } catch (error) {
      console.error('Global some: Error during some operation:', error);
      return false;
    }
  };

  const createSafeEvery = () => (array: any, predicate: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.every(predicate);
    } catch (error) {
      console.error('Global every: Error during every operation:', error);
      return true;
    }
  };

  const createSafeReduce = () => (array: any, reducer: any, initialValue: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.reduce(reducer, initialValue);
    } catch (error) {
      console.error('Global reduce: Error during reduce operation:', error);
      return initialValue;
    }
  };

  const createSafeForEach = () => (array: any, callback: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.forEach(callback);
    } catch (error) {
      console.error('Global forEach: Error during forEach operation:', error);
    }
  };

  // Initialize T object
  if (!(window as any).T) {
    (window as any).T = {};
  }
  
  (window as any).T.filter = (window as any).T.filter || createSafeFilter();
  (window as any).T.map = (window as any).T.map || createSafeMap();
  (window as any).T.find = (window as any).T.find || createSafeFind();
  (window as any).T.some = (window as any).T.some || createSafeSome();
  (window as any).T.every = (window as any).T.every || createSafeEvery();
  (window as any).T.reduce = (window as any).T.reduce || createSafeReduce();
  (window as any).T.forEach = (window as any).T.forEach || createSafeForEach();

  // Initialize D object (for any D.filter usage)
  if (!(window as any).D) {
    (window as any).D = {};
  }
  
  (window as any).D.filter = (window as any).D.filter || createSafeFilter();
  (window as any).D.map = (window as any).D.map || createSafeMap();
  (window as any).D.find = (window as any).D.find || createSafeFind();
  (window as any).D.some = (window as any).D.some || createSafeSome();
  (window as any).D.every = (window as any).D.every || createSafeEvery();
  (window as any).D.reduce = (window as any).D.reduce || createSafeReduce();
  (window as any).D.forEach = (window as any).D.forEach || createSafeForEach();
  
  // Additional debugging for D object
  console.log('🔍 D object initialized in t-object-init.ts:', (window as any).D);
  console.log('🔍 D.filter type in t-object-init.ts:', typeof (window as any).D.filter);

  // Initialize R object (for any R.filter usage)
  if (!(window as any).R) {
    (window as any).R = {};
  }
  
  (window as any).R.filter = (window as any).R.filter || createSafeFilter();
  (window as any).R.map = (window as any).R.map || createSafeMap();
  (window as any).R.find = (window as any).R.find || createSafeFind();
  (window as any).R.some = (window as any).R.some || createSafeSome();
  (window as any).R.every = (window as any).R.every || createSafeEvery();
  (window as any).R.reduce = (window as any).R.reduce || createSafeReduce();
  (window as any).R.forEach = (window as any).R.forEach || createSafeForEach();

  // Initialize P object (for any P.filter usage)
  if (!(window as any).P) {
    (window as any).P = {};
  }
  
  (window as any).P.filter = (window as any).P.filter || createSafeFilter();
  (window as any).P.map = (window as any).P.map || createSafeMap();
  (window as any).P.find = (window as any).P.find || createSafeFind();
  (window as any).P.some = (window as any).P.some || createSafeSome();
  (window as any).P.every = (window as any).P.every || createSafeEvery();
  (window as any).P.reduce = (window as any).P.reduce || createSafeReduce();
  (window as any).P.forEach = (window as any).P.forEach || createSafeForEach();

  // Initialize M object (for any M.filter usage)
  if (!(window as any).M) {
    (window as any).M = {};
  }
  
  (window as any).M.filter = (window as any).M.filter || createSafeFilter();
  (window as any).M.map = (window as any).M.map || createSafeMap();
  (window as any).M.find = (window as any).M.find || createSafeFind();
  (window as any).M.some = (window as any).M.some || createSafeSome();
  (window as any).M.every = (window as any).M.every || createSafeEvery();
  (window as any).M.reduce = (window as any).M.reduce || createSafeReduce();
  (window as any).M.forEach = (window as any).M.forEach || createSafeForEach();

  // Universal single-letter global object protection
  // This covers ALL single-letter global objects (A-Z) that might need array methods
  const singleLetterObjects = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  
  singleLetterObjects.forEach(letter => {
    if (!(window as any)[letter]) {
      (window as any)[letter] = {};
    }
    
    (window as any)[letter].filter = (window as any)[letter].filter || createSafeFilter();
    (window as any)[letter].map = (window as any)[letter].map || createSafeMap();
    (window as any)[letter].find = (window as any)[letter].find || createSafeFind();
    (window as any)[letter].some = (window as any)[letter].some || createSafeSome();
    (window as any)[letter].every = (window as any)[letter].every || createSafeEvery();
    (window as any)[letter].reduce = (window as any)[letter].reduce || createSafeReduce();
    (window as any)[letter].forEach = (window as any)[letter].forEach || createSafeForEach();
  });

  console.log('✅ ALL single-letter global objects (A-Z) initialized with array methods');
}

// Export a function to ensure all global objects are available
export function ensureGlobalObjects() {
  if (typeof window !== 'undefined') {
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

    const createSafeFilter = () => (array: any, predicate: any) => {
      try {
        const safeArr = safeArray(array);
        return safeArr.filter(predicate);
      } catch (error) {
        console.error('Global filter: Error during filtering:', error);
        return [];
      }
    };

    // Ensure T object
    if (!(window as any).T) {
      (window as any).T = {};
    }
    (window as any).T.filter = (window as any).T.filter || createSafeFilter();

    // Ensure D object
    if (!(window as any).D) {
      (window as any).D = {};
    }
    (window as any).D.filter = (window as any).D.filter || createSafeFilter();

    // Ensure R object
    if (!(window as any).R) {
      (window as any).R = {};
    }
    (window as any).R.filter = (window as any).R.filter || createSafeFilter();

    // Ensure P object
    if (!(window as any).P) {
      (window as any).P = {};
    }
    (window as any).P.filter = (window as any).P.filter || createSafeFilter();

    // Ensure M object
    if (!(window as any).M) {
      (window as any).M = {};
    }
    (window as any).M.filter = (window as any).M.filter || createSafeFilter();

    // Universal single-letter global object protection
    const singleLetterObjects = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    
    singleLetterObjects.forEach(letter => {
      if (!(window as any)[letter]) {
        (window as any)[letter] = {};
      }
      (window as any)[letter].filter = (window as any)[letter].filter || createSafeFilter();
    });

    console.log('✅ ALL single-letter global objects (A-Z) reinitialized via ensureGlobalObjects function');
  }
}

// Backward compatibility
export function ensureTObject() {
  ensureGlobalObjects();
}

// Auto-ensure on import
ensureGlobalObjects();
