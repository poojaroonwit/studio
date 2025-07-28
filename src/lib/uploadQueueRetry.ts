import { logAudit } from './auditLog';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retries: number;
  totalTime: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

/**
 * Exponential backoff delay calculation
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Generic retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: string
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await operation();
      const totalTime = Date.now() - startTime;
      
      if (attempt > 0 && context) {
        await logAudit('INFO', `Retry succeeded after ${attempt} attempts for ${context}`, 'Retry:Success', null, {
          context,
          attempts: attempt,
          totalTime
        });
      }

      return {
        success: true,
        data: result,
        retries: attempt,
        totalTime
      };
    } catch (error) {
      lastError = error as Error;
      const totalTime = Date.now() - startTime;

      if (attempt === finalConfig.maxRetries) {
        // Final attempt failed
        if (context) {
          await logAudit('ERROR', `Retry failed after ${attempt + 1} attempts for ${context}`, 'Retry:Failure', null, {
            context,
            attempts: attempt + 1,
            totalTime,
            error: lastError.message
          });
        }

        return {
          success: false,
          error: lastError.message,
          retries: attempt + 1,
          totalTime
        };
      }

      // Log retry attempt
      if (context) {
        await logAudit('WARN', `Retry attempt ${attempt + 1} for ${context}`, 'Retry:Attempt', null, {
          context,
          attempt: attempt + 1,
          maxRetries: finalConfig.maxRetries,
          error: lastError.message
        });
      }

      // Wait before next attempt
      const delay = calculateDelay(attempt, finalConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript requires it
  return {
    success: false,
    error: 'Unexpected retry failure',
    retries: finalConfig.maxRetries + 1,
    totalTime: Date.now() - startTime
  };
}

/**
 * Retry upload queue insertion with specific error handling
 */
export async function retryUploadQueueInsertion(
  operation: () => Promise<any>,
  fileName: string,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<any>> {
  return retryWithBackoff(
    operation,
    config,
    `UploadQueue:Insert:${fileName}`
  );
}

/**
 * Retry bulk upload queue insertion
 */
export async function retryBulkUploadQueueInsertion(
  operation: () => Promise<any>,
  batchId: string,
  fileCount: number,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<any>> {
  return retryWithBackoff(
    operation,
    config,
    `UploadQueue:BulkInsert:${batchId}:${fileCount}files`
  );
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
      errorMessage.includes('ETIMEDOUT')) {
    return true;
  }

  // Database connection errors
  if (errorCode === 'ECONNREFUSED' ||
      errorCode === 'ENOTFOUND' ||
      errorCode === 'ETIMEDOUT' ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout')) {
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
 * Enhanced retry with retryable error checking
 */
export async function retryWithErrorChecking<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: string
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await operation();
      const totalTime = Date.now() - startTime;
      
      if (attempt > 0 && context) {
        await logAudit('INFO', `Retry succeeded after ${attempt} attempts for ${context}`, 'Retry:Success', null, {
          context,
          attempts: attempt,
          totalTime
        });
      }

      return {
        success: true,
        data: result,
        retries: attempt,
        totalTime
      };
    } catch (error) {
      lastError = error as Error;
      const totalTime = Date.now() - startTime;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        if (context) {
          await logAudit('ERROR', `Non-retryable error for ${context}`, 'Retry:NonRetryable', null, {
            context,
            error: lastError.message
          });
        }

        return {
          success: false,
          error: lastError.message,
          retries: 0,
          totalTime
        };
      }

      if (attempt === finalConfig.maxRetries) {
        // Final attempt failed
        if (context) {
          await logAudit('ERROR', `Retry failed after ${attempt + 1} attempts for ${context}`, 'Retry:Failure', null, {
            context,
            attempts: attempt + 1,
            totalTime,
            error: lastError.message
          });
        }

        return {
          success: false,
          error: lastError.message,
          retries: attempt + 1,
          totalTime
        };
      }

      // Log retry attempt
      if (context) {
        await logAudit('WARN', `Retry attempt ${attempt + 1} for ${context}`, 'Retry:Attempt', null, {
          context,
          attempt: attempt + 1,
          maxRetries: finalConfig.maxRetries,
          error: lastError.message
        });
      }

      // Wait before next attempt
      const delay = calculateDelay(attempt, finalConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: 'Unexpected retry failure',
    retries: finalConfig.maxRetries + 1,
    totalTime: Date.now() - startTime
  };
} 