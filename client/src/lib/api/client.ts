/**
 * Centralized API Client
 * Provides consistent error handling, retry logic, request interceptors, and type safety
 */

import { retryOperation } from '../utils/retry';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000;

// Error classes
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string, originalError?: unknown) {
    super(message, undefined, 'NETWORK_ERROR', originalError);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor(message: string = 'Request timeout') {
    super(message, undefined, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

// Request configuration
export interface RequestConfig extends RequestInit {
  timeout?: number;
  retry?: {
    attempts?: number;
    delay?: number;
    retryableStatusCodes?: number[];
  };
  skipAuth?: boolean;
}

// Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
}

// Request interceptor type
type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
type ResponseInterceptor = <T>(response: Response, data: T) => T | Promise<T>;
type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>;

class ApiClient {
  private baseUrl: string;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Build full URL
   */
  private buildUrl(endpoint: string): string {
    // If endpoint is already a full URL, use it as-is
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    // If baseUrl is empty, use relative path
    if (!this.baseUrl) {
      return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    }

    // Combine baseUrl and endpoint
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  /**
   * Apply request interceptors
   */
  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = { ...config };

    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }

    return processedConfig;
  }

  /**
   * Apply response interceptors
   */
  private async applyResponseInterceptors<T>(response: Response, data: T): Promise<T> {
    let processedData = data;

    for (const interceptor of this.responseInterceptors) {
      processedData = await interceptor(response, processedData);
    }

    return processedData;
  }

  /**
   * Apply error interceptors
   */
  private async applyErrorInterceptors(error: ApiError): Promise<ApiError> {
    let processedError = error;

    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor(processedError);
    }

    return processedError;
  }

  /**
   * Create abort controller with timeout
   */
  private createAbortController(timeout: number): AbortController {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Clean up timeout when abort is called
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));
    
    return controller;
  }

  /**
   * Handle response and parse JSON
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Check if response is ok
    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      let errorData: { message?: string; error?: string; errorCode?: string } = {};

      try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } else {
          errorMessage = response.statusText || errorMessage;
        }
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      // Handle specific HTTP status codes
      if (response.status === 400) {
        errorMessage = errorData.message || 'Invalid request. Please check your inputs.';
      } else if (response.status === 401) {
        errorMessage = 'Authentication required. Please connect your wallet.';
      } else if (response.status === 403) {
        errorMessage = errorData.message || 'Permission denied. You don\'t have access to perform this action.';
      } else if (response.status === 404) {
        errorMessage = 'Endpoint not found. Please refresh the page.';
      } else if (response.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (response.status >= 500) {
        errorMessage = errorData.message || 'Server error. Our team has been notified. Please try again later.';
      }

      throw new ApiError(
        errorMessage,
        response.status,
        errorData.errorCode || `HTTP_${response.status}`,
        errorData
      );
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return this.applyResponseInterceptors(response, data);
    }

    // For non-JSON responses, return as text
    const text = await response.text();
    return this.applyResponseInterceptors(response, text as unknown as T);
  }

  /**
   * Make HTTP request
   */
  async request<T = unknown>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = API_TIMEOUT,
      retry: retryConfig,
      headers: customHeaders,
      ...fetchConfig
    } = config;

    // Apply request interceptors
    const processedConfig = await this.applyRequestInterceptors(config);

    // Build URL
    const url = this.buildUrl(endpoint);

    // Merge headers
    const headers = new Headers(customHeaders);
    if (!headers.has('Content-Type') && fetchConfig.body) {
      headers.set('Content-Type', 'application/json');
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      ...fetchConfig,
      headers,
      ...processedConfig,
    };

    // Create abort controller
    const controller = this.createAbortController(timeout);

    // Define the request operation
    const requestOperation = async (): Promise<ApiResponse<T>> => {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        const data = await this.handleResponse<T>(response);
        return data as ApiResponse<T>;
      } catch (error) {
        // Handle abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new TimeoutError(`Request timeout after ${timeout}ms`);
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new NetworkError(
            'Unable to connect to server. Please check your internet connection.',
            error
          );
        }

        // Re-throw ApiError instances
        if (error instanceof ApiError) {
          throw error;
        }

        // Wrap unknown errors
        throw new ApiError(
          error instanceof Error ? error.message : 'Unknown error occurred',
          undefined,
          'UNKNOWN_ERROR',
          error
        );
      }
    };

    // Determine retry configuration
    const retryAttempts = retryConfig?.attempts ?? DEFAULT_RETRY_ATTEMPTS;
    const retryDelay = retryConfig?.delay ?? DEFAULT_RETRY_DELAY;
    const retryableStatusCodes = retryConfig?.retryableStatusCodes ?? [408, 429, 500, 502, 503, 504];

    // Execute request with retry logic
    try {
      if (retryAttempts > 1) {
        return await retryOperation(
          requestOperation,
          {
            maxAttempts: retryAttempts,
            baseDelay: retryDelay,
            maxDelay: 10000,
            backoffMultiplier: 2,
            shouldRetry: (error) => {
              if (error instanceof ApiError && error.statusCode) {
                return retryableStatusCodes.includes(error.statusCode);
              }
              if (error instanceof NetworkError || error instanceof TimeoutError) {
                return true;
              }
              return false;
            },
          }
        );
      } else {
        return await requestOperation();
      }
    } catch (error) {
      const apiError = error instanceof ApiError
        ? error
        : new ApiError(
            error instanceof Error ? error.message : 'Unknown error occurred',
            undefined,
            'UNKNOWN_ERROR',
            error
          );

      // Apply error interceptors
      const processedError = await this.applyErrorInterceptors(apiError);
      throw processedError;
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

// Create default client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Add default request interceptor for logging (dev only)
if (import.meta.env.DEV) {
  apiClient.addRequestInterceptor((config) => {
    console.log('[API Request]', config);
    return config;
  });
}

// Add default error interceptor for logging
apiClient.addErrorInterceptor((error) => {
  console.error('[API Error]', {
    message: error.message,
    statusCode: error.statusCode,
    code: error.code,
    data: error.data,
  });
  return error;
});

// Export default instance
export default apiClient;

