// T Object Initialization - Import this early to ensure T object is available
// This file should be imported before any components that might use T.filter

if (typeof window !== 'undefined') {
  // Always ensure T object exists
  if (!(window as any).T) {
    (window as any).T = {};
  }
  
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
  
  // Ensure all methods exist with robust error handling
  (window as any).T.filter = (window as any).T.filter || ((array: any, predicate: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.filter(predicate);
    } catch (error) {
      console.error('T.filter: Error during filtering:', error);
      return [];
    }
  });
  
  (window as any).T.map = (window as any).T.map || ((array: any, mapper: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.map(mapper);
    } catch (error) {
      console.error('T.map: Error during mapping:', error);
      return [];
    }
  });
  
  (window as any).T.find = (window as any).T.find || ((array: any, predicate: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.find(predicate);
    } catch (error) {
      console.error('T.find: Error during finding:', error);
      return undefined;
    }
  });
  
  (window as any).T.some = (window as any).T.some || ((array: any, predicate: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.some(predicate);
    } catch (error) {
      console.error('T.some: Error during some operation:', error);
      return false;
    }
  });
  
  (window as any).T.every = (window as any).T.every || ((array: any, predicate: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.every(predicate);
    } catch (error) {
      console.error('T.every: Error during every operation:', error);
      return true;
    }
  });
  
  (window as any).T.reduce = (window as any).T.reduce || ((array: any, reducer: any, initialValue: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.reduce(reducer, initialValue);
    } catch (error) {
      console.error('T.reduce: Error during reduce operation:', error);
      return initialValue;
    }
  });
  
  (window as any).T.forEach = (window as any).T.forEach || ((array: any, callback: any) => {
    try {
      const safeArr = safeArray(array);
      return safeArr.forEach(callback);
    } catch (error) {
      console.error('T.forEach: Error during forEach operation:', error);
    }
  });
  
  console.log('✅ T object initialized in dedicated init file with all methods');
}

// Export a function to ensure T object is available
export function ensureTObject() {
  if (typeof window !== 'undefined' && !(window as any).T) {
    console.warn('T object not found, reinitializing...');
    // Re-run initialization
    if (!(window as any).T) {
      (window as any).T = {};
    }
    
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
    
    (window as any).T.filter = (window as any).T.filter || ((array: any, predicate: any) => {
      try {
        const safeArr = safeArray(array);
        return safeArr.filter(predicate);
      } catch (error) {
        console.error('T.filter: Error during filtering:', error);
        return [];
      }
    });
    
    console.log('✅ T object reinitialized via ensureTObject function');
  }
}

// Auto-ensure on import
ensureTObject();
