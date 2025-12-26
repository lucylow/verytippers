/**
 * Request and Response Interceptors
 * Example interceptors for authentication, logging, etc.
 */

import type { RequestConfig } from './client';
import { apiClient } from './client';

/**
 * Request interceptor for adding authentication headers
 * Usage: apiClient.addRequestInterceptor(authInterceptor)
 */
export function createAuthInterceptor(getAuthToken: () => string | null) {
  return (config: RequestConfig): RequestConfig => {
    if (config.skipAuth) {
      return config;
    }

    const token = getAuthToken();
    if (token) {
      const headers = new Headers(config.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return {
        ...config,
        headers,
      };
    }

    return config;
  };
}

/**
 * Request interceptor for adding user ID header
 * Usage: apiClient.addRequestInterceptor(createUserIdInterceptor(() => userAddress))
 */
export function createUserIdInterceptor(getUserId: () => string | null) {
  return (config: RequestConfig): RequestConfig => {
    const userId = getUserId();
    if (userId) {
      const headers = new Headers(config.headers);
      headers.set('X-User-Id', userId);
      return {
        ...config,
        headers,
      };
    }

    return config;
  };
}

/**
 * Response interceptor for logging (development only)
 */
export function createLoggingInterceptor() {
  return async <T>(response: Response, data: T): Promise<T> => {
    if (import.meta.env.DEV) {
      console.log('[API Response]', {
        url: response.url,
        status: response.status,
        data,
      });
    }
    return data;
  };
}

/**
 * Setup default interceptors
 * This function can be called during app initialization
 */
export function setupDefaultInterceptors(options?: {
  getAuthToken?: () => string | null;
  getUserId?: () => string | null;
}) {
  // Add logging interceptor
  apiClient.addResponseInterceptor(createLoggingInterceptor());

  // Add auth interceptor if provided
  if (options?.getAuthToken) {
    apiClient.addRequestInterceptor(createAuthInterceptor(options.getAuthToken));
  }

  // Add user ID interceptor if provided
  if (options?.getUserId) {
    apiClient.addRequestInterceptor(createUserIdInterceptor(options.getUserId));
  }
}

