/**
 * Enhanced Meta-Transaction Builder
 * Creates structured meta-transactions with deadline protection
 */

import { ethers } from 'ethers';

export interface MetaTx {
  from: string;
  to: string;
  amount: string; // BigInt as string
  cid: string; // IPFS CID for message
  nonce: number;
  deadline: number; // Unix timestamp
}

export interface MetaTxWithSignature extends MetaTx {
  signature: string;
}

/**
 * Builds a meta-transaction object
 * Includes deadline protection and nonce for replay prevention
 */
export function buildMetaTx({
  from,
  to,
  amount,
  cid,
  nonce,
  deadline
}: {
  from: string;
  to: string;
  amount: number; // Amount in VERY tokens (will be converted to wei)
  cid: string;
  nonce: number;
  deadline?: number; // Optional deadline, defaults to 5 minutes from now
}): MetaTx {
  // Validate inputs
  if (!ethers.isAddress(from)) {
    throw new Error('Invalid from address');
  }
  if (!ethers.isAddress(to)) {
    throw new Error('Invalid to address');
  }
  if (amount <= 0 || !isFinite(amount)) {
    throw new Error('Invalid amount');
  }
  if (!cid || cid.trim().length === 0) {
    throw new Error('CID is required');
  }

  // Convert amount to wei (assuming 18 decimals)
  const amountWei = BigInt(Math.floor(amount * 1e18));

  // Set deadline to 5 minutes from now if not provided
  const txDeadline = deadline || Math.floor(Date.now() / 1000) + 300; // 5 minutes

  // Validate deadline is in the future
  const now = Math.floor(Date.now() / 1000);
  if (txDeadline <= now) {
    throw new Error('Deadline must be in the future');
  }

  return {
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    amount: amountWei.toString(),
    cid,
    nonce,
    deadline: txDeadline
  };
}

/**
 * Validates a meta-transaction
 */
export function validateMetaTx(metaTx: MetaTx): { valid: boolean; error?: string } {
  try {
    // Check addresses
    if (!ethers.isAddress(metaTx.from)) {
      return { valid: false, error: 'Invalid from address' };
    }
    if (!ethers.isAddress(metaTx.to)) {
      return { valid: false, error: 'Invalid to address' };
    }

    // Check amount
    try {
      const amount = BigInt(metaTx.amount);
      if (amount <= 0n) {
        return { valid: false, error: 'Amount must be greater than zero' };
      }
    } catch {
      return { valid: false, error: 'Invalid amount format' };
    }

    // Check CID
    if (!metaTx.cid || metaTx.cid.trim().length === 0) {
      return { valid: false, error: 'CID is required' };
    }

    // Check nonce
    if (typeof metaTx.nonce !== 'number' || metaTx.nonce < 0) {
      return { valid: false, error: 'Invalid nonce' };
    }

    // Check deadline
    const now = Math.floor(Date.now() / 1000);
    if (metaTx.deadline <= now) {
      return { valid: false, error: 'Transaction has expired' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

/**
 * Checks if a meta-transaction has expired
 */
export function isMetaTxExpired(metaTx: MetaTx): boolean {
  const now = Math.floor(Date.now() / 1000);
  return metaTx.deadline <= now;
}

/**
 * Gets time remaining until deadline (in seconds)
 */
export function getTimeRemaining(metaTx: MetaTx): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, metaTx.deadline - now);
}

/**
 * Formats time remaining as human-readable string
 */
export function formatTimeRemaining(metaTx: MetaTx): string {
  const seconds = getTimeRemaining(metaTx);
  if (seconds === 0) return 'Expired';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/**
 * Serializes meta-transaction for storage/transmission
 */
export function serializeMetaTx(metaTx: MetaTx): string {
  return JSON.stringify(metaTx);
}

/**
 * Deserializes meta-transaction
 */
export function deserializeMetaTx(serialized: string): MetaTx {
  try {
    const parsed = JSON.parse(serialized);
    // Validate after parsing
    const validation = validateMetaTx(parsed);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to deserialize meta-transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

