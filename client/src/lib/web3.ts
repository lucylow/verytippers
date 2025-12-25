import { ethers } from 'ethers';

const CONTRACT_ADDRESSES = {
    TIP_CONTRACT: '0xTipContractAddress',
    VERY_TOKEN: '0xVeryTokenAddress',
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

export async function signTipMetaTx(
    senderAddress: string,
    recipientAddress: string,
    amount: string,
    token: string,
    messageHash: string
): Promise<string> {
    try {
        if (!window.ethereum) {
            throw new WalletError(
                "No crypto wallet found. Please install a wallet extension like MetaMask.",
                "NO_WALLET"
            );
        }

        // Validate addresses
        if (!ethers.isAddress(senderAddress)) {
            throw new WalletError(
                `Invalid sender address: ${senderAddress}`,
                "INVALID_ADDRESS"
            );
        }

        if (!ethers.isAddress(recipientAddress)) {
            throw new WalletError(
                `Invalid recipient address: ${recipientAddress}`,
                "INVALID_ADDRESS"
            );
        }

        if (!ethers.isAddress(token)) {
            throw new WalletError(
                `Invalid token address: ${token}`,
                "INVALID_ADDRESS"
            );
        }

        // Validate amount
        try {
            const parsedAmount = ethers.parseUnits(amount, 18);
            if (parsedAmount <= 0n) {
                throw new WalletError(
                    "Amount must be greater than zero",
                    "INVALID_AMOUNT"
                );
            }
        } catch (error) {
            if (error instanceof WalletError) {
                throw error;
            }
            throw new WalletError(
                `Invalid amount format: ${amount}`,
                "INVALID_AMOUNT",
                error
            );
        }

        let provider: ethers.BrowserProvider;
        try {
            provider = new ethers.BrowserProvider(window.ethereum);
        } catch (error) {
            throw new WalletError(
                "Failed to initialize wallet provider",
                "PROVIDER_INIT_ERROR",
                error
            );
        }

        let signer: ethers.JsonRpcSigner;
        try {
            signer = await provider.getSigner();
        } catch (error) {
            throw new WalletError(
                "Failed to get wallet signer. Please ensure your wallet is unlocked.",
                "SIGNER_ERROR",
                error
            );
        }

        const domain = {
            name: 'VeryTippers',
            version: '1',
            chainId: 12345, // Very Chain ID
            verifyingContract: CONTRACT_ADDRESSES.TIP_CONTRACT
        };

        const types = {
            Tip: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'token', type: 'address' },
                { name: 'amount', type: 'uint256' },
                { name: 'messageHash', type: 'string' }
            ]
        };

        const value = {
            from: senderAddress,
            to: recipientAddress,
            token: token,
            amount: ethers.parseUnits(amount, 18),
            messageHash: messageHash
        };

        try {
            const signature = await signer.signTypedData(domain, types, value);
            return signature;
        } catch (error: unknown) {
            // Handle user rejection
            if (error && typeof error === 'object' && 'code' in error) {
                const errorCode = (error as { code: string }).code;
                if (errorCode === 'ACTION_REJECTED' || errorCode === '4001') {
                    throw new WalletError(
                        "Transaction signature was rejected by user",
                        "USER_REJECTED",
                        error
                    );
                }
            }

            // Handle other signing errors
            throw new WalletError(
                "Failed to sign transaction. Please try again.",
                "SIGNING_ERROR",
                error
            );
        }
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
