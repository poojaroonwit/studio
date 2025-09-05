// src/lib/networkUtils.ts
// Network utilities for health checks and connection diagnostics

export interface NetworkHealthResult {
  isHealthy: boolean;
  latency: number;
  error?: string;
  details?: {
    dnsResolution: boolean;
    connectionEstablished: boolean;
    responseReceived: boolean;
  };
}

export interface ApiHealthResult {
  isHealthy: boolean;
  endpoints: {
    [key: string]: {
      status: 'healthy' | 'unhealthy' | 'unknown';
      responseTime: number;
      error?: string;
    };
  };
}

/**
 * Check network connectivity to a specific endpoint
 */
export async function checkNetworkHealth(url: string, timeout = 5000): Promise<NetworkHealthResult> {
  const startTime = Date.now();
  let timeoutId: NodeJS.Timeout | null = null;
  
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to minimize data transfer
      signal: controller.signal,
      cache: 'no-cache',
    });
    
    // Clear timeout on successful response
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return {
        isHealthy: true,
        latency,
        details: {
          dnsResolution: true,
          connectionEstablished: true,
          responseReceived: true,
        },
      };
    } else {
      return {
        isHealthy: false,
        latency,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: {
          dnsResolution: true,
          connectionEstablished: true,
          responseReceived: false,
        },
      };
    }
  } catch (error: any) {
    // Clear timeout on error
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    const latency = Date.now() - startTime;
    
    // Determine the type of error
    let details = {
      dnsResolution: false,
      connectionEstablished: false,
      responseReceived: false,
    };
    
    if (error.name === 'AbortError') {
      return {
        isHealthy: false,
        latency,
        error: 'Request timeout',
        details,
      };
    }
    
    if (error.message.includes('fetch')) {
      details.dnsResolution = true;
      details.connectionEstablished = false;
    }
    
    return {
      isHealthy: false,
      latency,
      error: error.message || 'Network error',
      details,
    };
  }
}

/**
 * Check health of multiple API endpoints
 */
export async function checkApiHealth(endpoints: string[]): Promise<ApiHealthResult> {
  const results: ApiHealthResult = {
    isHealthy: true,
    endpoints: {},
  };
  
  const healthChecks = endpoints.map(async (endpoint) => {
    const startTime = Date.now();
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        results.endpoints[endpoint] = {
          status: 'healthy',
          responseTime,
        };
      } else {
        results.endpoints[endpoint] = {
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}`,
        };
        results.isHealthy = false;
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      results.endpoints[endpoint] = {
        status: 'unhealthy',
        responseTime,
        error: error.message || 'Network error',
      };
      results.isHealthy = false;
    }
  });
  
  await Promise.all(healthChecks);
  return results;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry on certain errors
      if (error.status === 404 || error.status === 403 || error.status === 401) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
              // Retry attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  const errorCode = error.code || '';
  
  // Network errors
  if (errorMessage.includes('fetch failed') || 
      errorMessage.includes('network') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED')) {
    return true;
  }
  
  // HTTP 5xx errors (server errors)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // Specific database errors that might be transient
  if (errorMessage.includes('deadlock') ||
      errorMessage.includes('lock timeout') ||
      errorMessage.includes('connection pool')) {
    return true;
  }
  
  return false;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';
  
  const errorMessage = error.message || error.toString() || '';
  const errorCode = error.code || '';
  const status = error.status || error.statusCode;
  
  // Network errors
  if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return 'Request timed out. The server took too long to respond. Please try again.';
  }
  
  if (errorMessage.includes('ECONNRESET')) {
    return 'Connection was reset. Please try again.';
  }
  
  if (errorMessage.includes('ENOTFOUND')) {
    return 'Server not found. Please check your connection and try again.';
  }
  
  if (errorMessage.includes('ECONNREFUSED')) {
    return 'Connection refused. The server may be down or unreachable.';
  }
  
  // HTTP status errors
  if (status === 401) {
    return 'Authentication required. Please refresh the page and try again.';
  }
  
  if (status === 403) {
    return 'Access denied. You do not have permission to perform this action. Please contact your administrator if you believe this is an error.';
  }
  
  if (status === 404) {
    return 'Resource not found. The requested item may have been deleted or moved.';
  }
  
  if (status === 500) {
    return 'Server error. Please try again or contact support if the problem persists.';
  }
  
  if (status >= 500) {
    return 'Server error. Please try again later.';
  }
  
  // Database errors
  if (errorMessage.includes('deadlock')) {
    return 'Database conflict. Please try again in a moment.';
  }
  
  if (errorMessage.includes('connection pool')) {
    return 'Database connection issue. Please try again.';
  }
  
  // Default
  return errorMessage || 'An unexpected error occurred. Please try again.';
}

/**
 * Handle API response and throw appropriate error with user-friendly message
 */
export function handleApiResponse(response: Response, defaultMessage: string = 'Request failed'): Response {
  if (!response.ok) {
    const status = response.status;
    let errorMessage = defaultMessage;
    
    // Handle specific HTTP status codes
    if (status === 401) {
      errorMessage = 'Authentication required. Please refresh the page and try again.';
    } else if (status === 403) {
      errorMessage = 'No permission';
    } else if (status === 404) {
      errorMessage = 'Resource not found. The requested item may have been deleted or moved.';
    } else if (status === 500) {
      errorMessage = 'Server error. Please try again or contact support if the problem persists.';
    } else if (status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }
    
    throw new Error(errorMessage);
  }
  
  return response;
}

/**
 * Handle API response with JSON parsing and error handling
 */
export async function handleApiResponseJson<T>(response: Response, defaultMessage: string = 'Request failed'): Promise<T> {
  const handledResponse = handleApiResponse(response, defaultMessage);
  return handledResponse.json();
}
