/**
 * Retry Utility
 * Handles retrying failed operations with exponential backoff
 */

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxDelay?: number;
  retryable?: (error: unknown) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
};

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
  const finalConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (
        finalConfig.retryable &&
        !finalConfig.retryable(error)
      ) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt < finalConfig.maxRetries) {
        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        const delay = Math.min(
          finalConfig.retryDelay *
            Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay || Infinity
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Retry with result object instead of throwing
 */
export async function retryOperationSafe<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: unknown) => void
): Promise<RetryResult<T>> {
  try {
    const data = await retryOperation(operation, config, onRetry);
    return {
      success: true,
      data,
      attempts: 1,
    };
  } catch (error) {
    return {
      success: false,
      error,
      attempts: (config.maxRetries || DEFAULT_RETRY_CONFIG.maxRetries) + 1,
    };
  }
}

/**
 * Safe async wrapper that catches and handles errors
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  onError?: (error: unknown) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      console.error("Unhandled error in safeAsync:", error);
    }
    return null;
  }
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage = "Operation timed out"
): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

