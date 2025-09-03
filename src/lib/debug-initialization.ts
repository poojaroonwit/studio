/**
 * Debug Initialization Utility
 * 
 * This utility helps debug initialization errors and provides tools to prevent
 * common issues like the 'ee' variable error.
 */

// Global error handler to catch initialization errors
let globalErrorHandler: ((error: Error, context: string) => void) | null = null;

export function setGlobalErrorHandler(handler: (error: Error, context: string) => void) {
  globalErrorHandler = handler;
}

export function getGlobalErrorHandler() {
  return globalErrorHandler;
}

// Enhanced error detection for initialization issues
export function detectInitializationError(error: Error): {
  isInitializationError: boolean;
  errorType: string;
  recommendations: string[];
  context: any;
} {
  const isInitializationError = 
    error.message.includes('Cannot access') ||
    error.message.includes('before initialization') ||
    error.message.includes('is not defined') ||
    error.name === 'ReferenceError';

  if (!isInitializationError) {
    return {
      isInitializationError: false,
      errorType: 'Other',
      recommendations: [],
      context: {}
    };
  }

  // Special handling for 'ee' variable error
  const isEeVariableError = error.message.includes('ee');
  
  let errorType = 'Temporal Dead Zone';
  let recommendations = [
    'Check for circular dependencies in imports',
    'Verify hook order in components',
    'Ensure context providers are properly initialized',
    'Check session/auth state initialization'
  ];

  if (isEeVariableError) {
    errorType = 'EE Variable Initialization Error';
    recommendations = [
      'This is likely a minified bundle issue',
      'Check for circular imports between modules',
      'Verify that all hooks are called in the same order',
      'Ensure context providers wrap components properly',
      'Check for conditional hook calls',
      'Verify session/auth initialization order'
    ];
  }

  const context = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server',
    isEeVariableError
  };

  // Log detailed error information
  console.error('Initialization Error Detected:', {
    errorType,
    context,
    recommendations
  });

  // Call global error handler if available
  if (globalErrorHandler) {
    try {
      globalErrorHandler(error, 'initialization_detection');
    } catch (handlerError) {
      console.error('Global error handler failed:', handlerError);
    }
  }

  return {
    isInitializationError: true,
    errorType,
    recommendations,
    context
  };
}

// Hook initialization monitor
export function createHookMonitor() {
  const hookCalls: Array<{
    component: string;
    hook: string;
    timestamp: number;
    stack: string;
  }> = [];

  return {
    logHookCall(component: string, hook: string) {
      hookCalls.push({
        component,
        hook,
        timestamp: Date.now(),
        stack: new Error().stack || ''
      });
    },

    getHookCalls() {
      return [...hookCalls];
    },

    checkHookOrder() {
      const issues: string[] = [];
      
      // Check for potential hook order violations
      const componentHooks = new Map<string, string[]>();
      
      hookCalls.forEach(call => {
        if (!componentHooks.has(call.component)) {
          componentHooks.set(call.component, []);
        }
        componentHooks.get(call.component)!.push(call.hook);
      });

      componentHooks.forEach((hooks, component) => {
        // Check for conditional hook calls
        const hookSet = new Set(hooks);
        if (hookSet.size !== hooks.length) {
          issues.push(`Component ${component} has duplicate hook calls: ${hooks.join(', ')}`);
        }
      });

      return issues;
    },

    clear() {
      hookCalls.length = 0;
    }
  };
}

// Session initialization monitor
export function createSessionMonitor() {
  let sessionState: 'uninitialized' | 'loading' | 'authenticated' | 'unauthenticated' = 'uninitialized';
  let sessionData: any = null;
  let initializationTime: number | null = null;

  return {
    setSessionState(state: typeof sessionState, data?: any) {
      const previousState = sessionState;
      sessionState = state;
      sessionData = data;
      
      if (state === 'loading' && previousState === 'uninitialized') {
        initializationTime = Date.now();
      }

      console.log(`Session state changed: ${previousState} -> ${state}`, {
        data: data ? 'present' : 'absent',
        initializationTime,
        timestamp: new Date().toISOString()
      });
    },

    getSessionState() {
      return { sessionState, sessionData, initializationTime };
    },

    isSessionReady() {
      return sessionState === 'authenticated' || sessionState === 'unauthenticated';
    }
  };
}

// Module dependency analyzer
export function analyzeModuleDependencies() {
  const moduleGraph = new Map<string, Set<string>>();
  const circularDependencies: string[][] = [];

  function addDependency(from: string, to: string) {
    if (!moduleGraph.has(from)) {
      moduleGraph.set(from, new Set());
    }
    moduleGraph.get(from)!.add(to);
  }

  function detectCircularDependencies() {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(module: string, path: string[]): boolean {
      if (recursionStack.has(module)) {
        const cycle = path.slice(path.indexOf(module));
        circularDependencies.push([...cycle, module]);
        return true;
      }

      if (visited.has(module)) {
        return false;
      }

      visited.add(module);
      recursionStack.add(module);
      path.push(module);

      const dependencies = moduleGraph.get(module) || new Set();
      for (const dep of dependencies) {
        if (dfs(dep, path)) {
          return true;
        }
      }

      path.pop();
      recursionStack.delete(module);
      return false;
    }

    for (const module of moduleGraph.keys()) {
      if (!visited.has(module)) {
        dfs(module, []);
      }
    }

    return circularDependencies;
  }

  return {
    addDependency,
    detectCircularDependencies,
    getModuleGraph: () => new Map(moduleGraph),
    getCircularDependencies: () => [...circularDependencies]
  };
}

// Initialize global error handling
if (typeof window !== 'undefined') {
  // Set up global error handler for unhandled errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    const context = 'global_error';
    
    if (detectInitializationError(error).isInitializationError) {
      console.error('Global initialization error caught:', {
        error,
        context,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    }
  });

  // Set up unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    const context = 'unhandled_promise_rejection';
    
    if (detectInitializationError(error).isInitializationError) {
      console.error('Unhandled promise rejection with initialization error:', {
        error,
        context
      });
    }
  });
}

// Export monitoring instances
export const hookMonitor = createHookMonitor();
export const sessionMonitor = createSessionMonitor();
export const dependencyAnalyzer = analyzeModuleDependencies();
