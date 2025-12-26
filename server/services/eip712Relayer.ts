// server/services/eip712Relayer.ts - Production Gasless Signing
import { ethers, Signer, TypedDataDomain, TypedDataField } from 'ethers';
import { config } from '../config';

// EIP-712 Domain for VeryTippers
const EIP712_DOMAIN: TypedDataDomain = {
    name: 'VeryTippers',
    version: '1',
    chainId: BigInt(42069), // VERY Chain ID (update based on actual chain ID)
    verifyingContract: config.TIP_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000' as `0x${string}`
};

// EIP-712 Tip type definition
const TIP_TYPE: Record<string, TypedDataField[]> = {
    Tip: [
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'ipfsCid', type: 'string' }
    ]
};

export interface TipData {
    recipient: string;
    amount: string; // Amount in ether (will be converted to wei)
    ipfsCid: string;
}

export interface MetaTransactionResult {
    metaTxData: TipData;
    signature: string;
    sender: string;
    domain: TypedDataDomain;
    types: Record<string, TypedDataField[]>;
}

/**
 * Create EIP-712 meta-transaction signature
 * @param signer - Ethers signer (user's wallet)
 * @param tip - Tip data (recipient, amount, ipfsCid)
 * @returns Meta-transaction data with signature
 */
export async function createMetaTransaction(
    signer: Signer,
    tip: TipData
): Promise<MetaTransactionResult> {
    // Get sender address
    const sender = await signer.getAddress();

    // Convert amount to BigInt (wei)
    const amountWei = ethers.parseEther(tip.amount);

    // Create message object matching the Tip type
    const message = {
        recipient: ethers.getAddress(tip.recipient) as `0x${string}`,
        amount: amountWei,
        ipfsCid: tip.ipfsCid
    };

    // Get chain ID from signer/provider if available
    let chainId = EIP712_DOMAIN.chainId;
    try {
        if (signer.provider) {
            const network = await signer.provider.getNetwork();
            chainId = BigInt(network.chainId);
        }
    } catch (error) {
        console.warn('Could not get chain ID from provider, using default:', error);
    }

    // Update domain with correct chain ID and contract address
    const domain: TypedDataDomain = {
        ...EIP712_DOMAIN,
        chainId: chainId,
        verifyingContract: (config.TIP_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`
    };

    // Sign typed data using EIP-712
    let signature: string;
    try {
        signature = await signer.signTypedData(domain, TIP_TYPE, message);
    } catch (error: any) {
        if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
            throw new Error('User rejected signature request');
        }
        throw new Error(`Failed to sign typed data: ${error.message || 'Unknown error'}`);
    }

    return {
        metaTxData: {
            recipient: message.recipient,
            amount: tip.amount, // Keep as original string for display
            ipfsCid: message.ipfsCid
        },
        signature,
        sender,
        domain,
        types: TIP_TYPE
    };
}

/**
 * Verify EIP-712 signature
 * @param metaTxResult - Meta-transaction result with signature
 * @returns True if signature is valid, false otherwise
 */
export function verifyMetaTransactionSignature(
    metaTxResult: MetaTransactionResult
): { valid: boolean; recoveredAddress?: string } {
    try {
        const message = {
            recipient: ethers.getAddress(metaTxResult.metaTxData.recipient) as `0x${string}`,
            amount: ethers.parseEther(metaTxResult.metaTxData.amount),
            ipfsCid: metaTxResult.metaTxData.ipfsCid
        };

        // Recover address from signature
        const recoveredAddress = ethers.verifyTypedData(
            metaTxResult.domain,
            metaTxResult.types,
            message,
            metaTxResult.signature
        );

        const isValid = recoveredAddress.toLowerCase() === metaTxResult.sender.toLowerCase();

        return {
            valid: isValid,
            recoveredAddress: isValid ? recoveredAddress : undefined
        };
    } catch (error: any) {
        console.error('Error verifying signature:', error);
        return { valid: false };
    }
}

/**
 * Create meta-transaction for relayer submission
 * This prepares the data structure needed for the relayer to execute the transaction
 */
export interface RelayerMetaTxRequest {
    from: string;
    to: string;
    data: string;
    signature: string;
    metaTxData: TipData;
}

/**
 * Build relayer request from meta-transaction result
 * Note: This is a simplified version. In production, you'd need to encode the contract call data
 */
export function buildRelayerRequest(
    metaTxResult: MetaTransactionResult,
    contractAddress: string
): RelayerMetaTxRequest {
    // TODO: Encode the actual contract call data based on your TipRouter contract interface
    // For now, this is a placeholder structure
    const data = '0x'; // This should be the encoded function call data

    return {
        from: metaTxResult.sender,
        to: contractAddress,
        data: data,
        signature: metaTxResult.signature,
        metaTxData: metaTxResult.metaTxData
    };
}
