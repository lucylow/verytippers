/**
 * API Client - Main export
 * Centralized API client with consistent error handling, retry logic, and type safety
 */

export { default as apiClient, ApiError, NetworkError, TimeoutError } from './client';
export type { RequestConfig, ApiResponse } from './client';

// Export API functions
export * from './tips';
export * from './analytics';
export * from './badges';

// Export types
export * from './types';

// Export interceptors
export * from './interceptors';

