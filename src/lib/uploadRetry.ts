// src/lib/uploadRetry.ts
// Retry utilities for upload operations with exponential backoff

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  totalTime: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  jitter: true
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  );

  if (config.jitter) {
<<<<<<< HEAD
    // Add jitter (±25% of the delay)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
=======
    // Add jitter (±25% of the delay) using crypto for better randomness
    let randomValue: number;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      randomValue = array[0] / 0xFFFFFFFF; // Normalize to 0-1
    } else {
      randomValue = Math.random(); // Fallback
    }
    const jitter = delay * 0.25 * (randomValue - 0.5);
>>>>>>> ca51ac36
    return Math.max(0, delay + jitter);
  }

  return delay;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message || error.toString();
  const errorCode = error.code || error.status;

  // Network errors
  if (errorMessage.includes('fetch failed') || 
      errorMessage.includes('network') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('ETIMEDOUT')) {
    return true;
  }

  // HTTP status codes
  if (errorCode) {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    if (retryableStatusCodes.includes(errorCode)) {
      return true;
    }
  }

  // MinIO specific errors
  if (errorMessage.includes('MinIO') || 
      errorMessage.includes('S3') ||
      errorMessage.includes('storage')) {
    return true;
  }

  // Database connection errors
  if (errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('pool')) {
    return true;
  }

  return false;
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      const isLastAttempt = attempt === finalConfig.maxAttempts;
      const isRetryable = isRetryableError(error);

      if (isLastAttempt || !isRetryable) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          attempts: attempt,
          totalTime: Date.now() - startTime
        };
      }

      // Wait before retrying
      const delay = calculateDelay(attempt, finalConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: 'Max retry attempts exceeded',
    attempts: finalConfig.maxAttempts,
    totalTime: Date.now() - startTime
  };
}

/**
 * Retry MinIO upload operation
 */
export async function retryMinIOUpload(
  uploadOperation: () => Promise<void>,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  const result = await retryWithBackoff(uploadOperation, {
    maxAttempts: 3,
    baseDelay: 2000, // 2 seconds for storage operations
    maxDelay: 15000  // 15 seconds max
  });

  if (!result.success) {
    console.error(`[UPLOAD] MinIO upload failed for ${fileName} after ${result.attempts} attempts:`, result.error);
  }

  return {
    success: result.success,
    error: result.success ? undefined : result.error
  };
}

/**
 * Retry database operation
 */
export async function retryDatabaseOperation<T>(
  dbOperation: () => Promise<T>,
  operationName: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const result = await retryWithBackoff(dbOperation, {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second for DB operations
    maxDelay: 8000   // 8 seconds max
  });

  if (!result.success) {
    console.error(`[UPLOAD] Database operation '${operationName}' failed after ${result.attempts} attempts:`, result.error);
  }

  return {
    success: result.success,
    data: result.data,
    error: result.success ? undefined : result.error
  };
}

/**
 * Batch retry for multiple operations
 */
export async function retryBatchOperations<T>(
  operations: Array<() => Promise<T>>,
  config: Partial<RetryConfig> = {}
): Promise<Array<{ success: boolean; data?: T; error?: string; index: number }>> {
  const results = await Promise.all(
    operations.map(async (operation, index) => {
      const result = await retryWithBackoff(operation, config);
      return {
        success: result.success,
        data: result.data,
        error: result.success ? undefined : result.error,
        index
      };
    })
  );

  return results;
} 
