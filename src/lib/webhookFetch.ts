/**
 * Webhook fetch utility with proper timeout handling
 * Fixes Node.js fetch HeadersTimeoutError issues
 */

export interface WebhookFetchOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export interface WebhookFetchResult {
  status: number;
  ok: boolean;
  body: string;
  headers: Record<string, string>;
  duration: number;
}

export class WebhookFetchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string,
    public isTimeout: boolean = false
  ) {
    super(message);
    this.name = 'WebhookFetchError';
  }
}

/**
 * Enhanced fetch function for webhooks with proper timeout handling
 */
export async function webhookFetch(options: WebhookFetchOptions): Promise<WebhookFetchResult> {
  const {
    url,
    method = 'POST',
    headers = {},
    body,
    timeoutMs = 30000, // Default 30 seconds
    retries = 0,
    retryDelayMs = 1000
  } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // Configure fetch options
        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Recruitment-System-Webhook/1.0',
            ...headers
          },
          signal: controller.signal,
          // Add keepalive to prevent connection issues
          keepalive: true,
        };

        // Add body if provided
        if (body) {
          fetchOptions.body = body;
        }

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        // Read response body
        const responseBody = await response.text();
        const duration = Date.now() - startTime;

        // Convert headers to plain object
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        return {
          status: response.status,
          ok: response.ok,
          body: responseBody,
          headers: responseHeaders,
          duration
        };

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Handle specific timeout errors
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            throw new WebhookFetchError(
              `Request timeout after ${timeoutMs}ms`,
              undefined,
              undefined,
              true
            );
          }
          
          // Handle Node.js specific timeout errors
          if (fetchError.message.includes('Headers Timeout Error') || 
              fetchError.message.includes('UND_ERR_HEADERS_TIMEOUT')) {
            throw new WebhookFetchError(
              `Connection timeout - the external service may be slow or unreachable`,
              undefined,
              undefined,
              true
            );
          }
          
          // Handle network errors
          if (fetchError.message.includes('fetch failed') || 
              fetchError.message.includes('ENOTFOUND') ||
              fetchError.message.includes('ECONNREFUSED')) {
            throw new WebhookFetchError(
              `Network error: ${fetchError.message}`,
              undefined,
              undefined,
              false
            );
          }
        }
        
        throw fetchError;
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        if (lastError instanceof WebhookFetchError) {
          throw lastError;
        }
        throw new WebhookFetchError(
          `Webhook request failed: ${lastError.message}`,
          undefined,
          undefined,
          false
        );
      }
      
      // Wait before retrying
      if (retryDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new WebhookFetchError('Unexpected error in webhook fetch');
}

/**
 * Legacy fetch wrapper for backward compatibility
 */
export async function legacyWebhookFetch(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
): Promise<Response> {
  const fetchOptions: RequestInit = {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Recruitment-System-Webhook/1.0',
      ...options.headers
    },
    signal: options.signal,
    keepalive: true,
  };

  if (options.body) {
    fetchOptions.body = options.body;
  }

  return fetch(url, fetchOptions);
}
