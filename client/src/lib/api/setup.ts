/**
 * API Client Setup
 * Configures default interceptors for authentication, logging, etc.
 * This should be called during app initialization
 */

import { setupDefaultInterceptors } from './interceptors';

/**
 * Setup API client with default interceptors
 * Call this during app initialization (e.g., in App.tsx or main.tsx)
 */
export function setupApiClient(options?: {
  getAuthToken?: () => string | null;
  getUserId?: () => string | null;
}) {
  setupDefaultInterceptors({
    getAuthToken: options?.getAuthToken,
    getUserId: options?.getUserId,
  });
}

/**
 * Setup API client with wallet integration
 * Use this when you have wallet context available
 */
export function setupApiClientWithWallet(
  getWalletAddress: () => string | null,
  getAuthToken?: () => string | null
) {
  setupApiClient({
    getAuthToken,
    getUserId: getWalletAddress,
  });
}

