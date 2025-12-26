/**
 * EIP-712 Typed Data Signing for Meta-Transactions
 * Production-grade signature generation
 */

import { ethers } from 'ethers';
import { MetaTx } from './metaTx';
import { VERY_CHAIN, CONTRACTS } from './config';

// EIP-712 Domain Separator
const DOMAIN = {
  name: 'VeryTippers',
  version: '1',
  chainId: VERY_CHAIN.chainId,
  verifyingContract: CONTRACTS.tipRouter.address
};

// EIP-712 Types
const TYPES = {
  MetaTx: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'cid', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

/**
 * Signs a meta-transaction using EIP-712 typed data signing
 */
export async function signMetaTx(
  signer: ethers.JsonRpcSigner,
  metaTx: MetaTx
): Promise<string> {
  try {
    // Validate meta-transaction first
    if (!metaTx.from || !metaTx.to || !metaTx.amount || !metaTx.cid) {
      throw new Error('Invalid meta-transaction: missing required fields');
    }

    // Ensure addresses are checksummed
    const normalizedMetaTx = {
      ...metaTx,
      from: ethers.getAddress(metaTx.from),
      to: ethers.getAddress(metaTx.to)
    };

    // Sign using EIP-712
    const signature = await signer.signTypedData(DOMAIN, TYPES, normalizedMetaTx);

    return signature;
  } catch (error: any) {
    // Handle user rejection
    if (error?.code === 'ACTION_REJECTED' || error?.code === 4001) {
      throw new Error('Transaction signature was rejected by user');
    }

    // Handle other errors
    throw new Error(
      `Failed to sign meta-transaction: ${error?.message || 'Unknown error'}`
    );
  }
}

/**
 * Verifies a meta-transaction signature
 */
export function verifyMetaTxSignature(
  metaTx: MetaTx,
  signature: string
): { valid: boolean; recoveredAddress?: string; error?: string } {
  try {
    const normalizedMetaTx = {
      ...metaTx,
      from: ethers.getAddress(metaTx.from),
      to: ethers.getAddress(metaTx.to)
    };

    const recoveredAddress = ethers.verifyTypedData(
      DOMAIN,
      TYPES,
      normalizedMetaTx,
      signature
    );

    const isValid = recoveredAddress.toLowerCase() === normalizedMetaTx.from.toLowerCase();

    return {
      valid: isValid,
      recoveredAddress: isValid ? recoveredAddress : undefined,
      error: isValid ? undefined : 'Signature does not match from address'
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Signature verification failed'
    };
  }
}

/**
 * Gets signer from window.ethereum
 */
export async function getSigner(): Promise<ethers.JsonRpcSigner> {
  if (!window.ethereum) {
    throw new Error('No wallet provider found. Please install MetaMask or another Web3 wallet.');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return signer;
  } catch (error) {
    throw new Error(
      `Failed to get signer: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Signs a meta-transaction with automatic signer retrieval
 */
export async function signMetaTxAuto(metaTx: MetaTx): Promise<string> {
  const signer = await getSigner();
  return signMetaTx(signer, metaTx);
}

/**
 * Gets the address of the signer
 */
export async function getSignerAddress(): Promise<string> {
  const signer = await getSigner();
  return await signer.getAddress();
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

