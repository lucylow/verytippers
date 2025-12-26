/**
 * Legacy Web3 Module - Maintains backward compatibility
 * New code should use @/lib/web3/index instead
 */

import { ethers } from 'ethers';
import {
  signMetaTxAuto,
  buildMetaTx,
  getNonce,
  ensureVeryNetwork,
  CONTRACTS
} from './web3/index';

// Re-export for backward compatibility
export const CONTRACT_ADDRESSES = {
    TIP_CONTRACT: CONTRACTS.tipRouter.address,
    VERY_TOKEN: CONTRACTS.veryToken.address,
};

export class WalletError extends Error {
    constructor(
        message: string,
        public code?: string,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'WalletError';
    }
}

export class NetworkError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'NetworkError';
    }
}

/**
 * Legacy signTipMetaTx - Now uses new Web3 modules
 * @deprecated Use signMetaTxAuto from @/lib/web3/index instead
 */
export async function signTipMetaTx(
    senderAddress: string,
    recipientAddress: string,
    amount: string,
    token: string,
    messageHash: string
): Promise<string> {
    try {
        // Ensure network
        await ensureVeryNetwork();

        // Get nonce
        const nonce = await getNonce(senderAddress);

        // Build meta-transaction (using messageHash as CID for backward compatibility)
        const metaTx = buildMetaTx({
            from: senderAddress,
            to: recipientAddress,
            amount: parseFloat(amount),
            cid: messageHash || '0x0',
            nonce
        });

        // Sign using new signing function
        return await signMetaTxAuto(metaTx);
    } catch (error) {
        // Re-throw WalletError as-is
        if (error instanceof WalletError) {
            throw error;
        }

        // Wrap unknown errors
        throw new WalletError(
            error instanceof Error ? error.message : "Unknown error occurred during signing",
            "UNKNOWN_ERROR",
            error
        );
    }
}

export async function sendTipToBackend(
    senderId: string,
    recipientId: string,
    amount: number,
    message: string,
    signature?: string
): Promise<{ success: boolean, message: string, error?: string }> {
    try {
        // Validate inputs
        if (!senderId || !recipientId) {
            return {
                success: false,
                message: 'Sender and recipient IDs are required.',
                error: 'VALIDATION_ERROR'
            };
        }

        if (amount <= 0 || !isFinite(amount)) {
            return {
                success: false,
                message: 'Amount must be a positive number.',
                error: 'VALIDATION_ERROR'
            };
        }

        if (!message || message.trim().length === 0) {
            return {
                success: false,
                message: 'Message cannot be empty.',
                error: 'VALIDATION_ERROR'
            };
        }

        let response: Response;
        try {
            response = await fetch('/api/v1/tip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    senderId,
                    recipientId,
                    amount: amount.toString(),
                    token: CONTRACT_ADDRESSES.VERY_TOKEN,
                    message,
                    signature // Real signature from EIP-712
                }),
            });
        } catch (error) {
            // Network errors (no response received)
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new NetworkError(
                    'Unable to connect to server. Please check your internet connection.',
                    undefined,
                    error
                );
            }
            throw error;
        }

        // Handle HTTP errors
        if (!response.ok) {
            let errorMessage = `Server error: ${response.status}`;
            let errorData: { message?: string; error?: string } = {};

            try {
                errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage;
            }

            throw new NetworkError(
                errorMessage,
                response.status,
                errorData
            );
        }

        // Parse successful response
        let data: { message?: string; error?: string };
        try {
            data = await response.json();
        } catch (error) {
            throw new NetworkError(
                'Invalid response format from server',
                response.status,
                error
            );
        }

        return {
            success: true,
            message: data.message || 'Tip sent successfully!'
        };
    } catch (error) {
        console.error('Frontend tip error:', error);

        if (error instanceof NetworkError) {
            return {
                success: false,
                message: error.message,
                error: error.statusCode ? `HTTP_${error.statusCode}` : 'NETWORK_ERROR'
            };
        }

        if (error instanceof WalletError) {
            return {
                success: false,
                message: error.message,
                error: error.code || 'WALLET_ERROR'
            };
        }

        // Generic error fallback
        const errorMessage = error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.';

        return {
            success: false,
            message: errorMessage,
            error: 'UNKNOWN_ERROR'
        };
    }
}
