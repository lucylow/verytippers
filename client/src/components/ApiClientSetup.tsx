/**
 * API Client Setup Component
 * Sets up API client interceptors with wallet context
 * Should be rendered inside WalletProvider
 */

import { useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { setupApiClientWithWallet } from '@/lib/api/setup';

export function ApiClientSetup() {
  const { address } = useWallet();

  useEffect(() => {
    // Setup API client with wallet address
    setupApiClientWithWallet(
      () => address || null,
      () => {
        // Optional: Add auth token retrieval if you have JWT tokens
        // return localStorage.getItem('authToken');
        return null;
      }
    );
  }, [address]);

  return null; // This component doesn't render anything
}

