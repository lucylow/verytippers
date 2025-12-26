/**
 * Unified Web3 Service
 * Main entry point for all Web3 operations
 */

import { ensureVeryNetwork, getNetworkStatus, onNetworkChange } from './network';
import { getVeryBalance, getNativeBalance, watchBalance, TokenBalance } from './balance';
import { getNonce, peekNonce, resetNonce } from './nonce';
import { buildMetaTx, validateMetaTx, isMetaTxExpired, formatTimeRemaining, MetaTx } from './metaTx';
import { signMetaTx, signMetaTxAuto, getSignerAddress, verifyMetaTxSignature } from './signMetaTx';
import { getGasBudget, chargeGas, estimateGasCostUSD, hasEnoughBudget, getFormattedBudget } from './relayerBudget';
import { subscribeTips, subscribeBadges, fetchPastTips, TipEvent, BadgeEvent } from './indexer';
import {
  getVeryTokenInfo,
  transferVeryTokens,
  approveVeryTokens,
  getVeryTokenAllowance,
  hasEnoughAllowance,
  transferFromVeryTokens,
  getVeryTokenContract,
  type TokenInfo,
  type TransferResult,
  type ApproveResult
} from './veryToken';
import { CONTRACTS, API_ENDPOINTS, FEATURES } from './config';
import { ethers } from 'ethers';

export interface SendTipOptions {
  useGasSponsorship?: boolean;
  deadline?: number;
}

export interface SendTipResult {
  success: boolean;
  transactionHash?: string;
  tipId?: number;
  error?: string;
  sponsored?: boolean;
}

/**
 * Main function to send a VERY tip
 * Handles network switching, signing, and submission
 */
export async function sendVeryTip({
  from,
  to,
  amount,
  cid,
  options = {}
}: {
  from: string;
  to: string;
  amount: number;
  cid: string;
  options?: SendTipOptions;
}): Promise<SendTipResult> {
  try {
    // 1. Ensure we're on the correct network
    await ensureVeryNetwork();

    // 2. Get nonce
    const nonce = await getNonce(from);

    // 3. Build meta-transaction
    const metaTx = buildMetaTx({
      from,
      to,
      amount,
      cid,
      nonce,
      deadline: options.deadline
    });

    // 4. Validate meta-transaction
    const validation = validateMetaTx(metaTx);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // 5. Sign meta-transaction
    let signature: string;
    try {
      signature = await signMetaTxAuto(metaTx);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to sign transaction'
      };
    }

    // 6. Submit to backend/relayer
    if (options.useGasSponsorship && FEATURES.ENABLE_GAS_SPONSORSHIP) {
      return await submitSponsoredTip(metaTx, signature);
    } else {
      return await submitRegularTip(metaTx, signature);
    }
  } catch (error: any) {
    console.error('Send tip error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Submits a sponsored (gasless) tip via relayer
 */
async function submitSponsoredTip(
  metaTx: MetaTx,
  signature: string
): Promise<SendTipResult> {
  try {
    // Check gas budget
    const estimatedCost = estimateGasCostUSD(200000n, 1000000000n); // Rough estimate
    if (!hasEnoughBudget(estimatedCost)) {
      // Fall back to regular transaction
      return await submitRegularTip(metaTx, signature);
    }

    const response = await fetch(API_ENDPOINTS.relayerTip, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...metaTx,
        signature
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Relayer submission failed');
    }

    const result = await response.json();

    // Charge gas from budget
    chargeGas(estimatedCost);

    return {
      success: true,
      transactionHash: result.txHash,
      tipId: result.tipId,
      sponsored: true
    };
  } catch (error: any) {
    console.error('Sponsored tip failed, falling back to regular:', error);
    // Fall back to regular transaction
    return await submitRegularTip(metaTx, signature);
  }
}

/**
 * Submits a regular (user pays gas) tip
 */
async function submitRegularTip(
  metaTx: MetaTx,
  signature: string
): Promise<SendTipResult> {
  try {
    const response = await fetch(API_ENDPOINTS.submitTip, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...metaTx,
        signature
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Tip submission failed');
    }

    const result = await response.json();

    return {
      success: true,
      transactionHash: result.txHash,
      tipId: result.tipId,
      sponsored: false
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Tip submission failed'
    };
  }
}

/**
 * Mock tip submission for demos
 */
async function submitMockTip({
  from,
  to,
  amount,
  cid
}: {
  from: string;
  to: string;
  amount: number;
  cid: string;
}): Promise<SendTipResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    success: true,
    transactionHash: `0x${Math.random().toString(16).slice(2)}`,
    tipId: Math.floor(Math.random() * 1000),
    sponsored: true
  };
}

// Re-export all utilities for convenience
// Note: sendVeryTip and SendTipResult are already exported above
export {
  // Network
  ensureVeryNetwork,
  getNetworkStatus,
  onNetworkChange,
  // Balance
  getVeryBalance,
  getNativeBalance,
  watchBalance,
  type TokenBalance,
  // Nonce
  getNonce,
  peekNonce,
  resetNonce,
  // MetaTx
  buildMetaTx,
  validateMetaTx,
  isMetaTxExpired,
  formatTimeRemaining,
  type MetaTx,
  // Signing
  signMetaTx,
  signMetaTxAuto,
  getSignerAddress,
  verifyMetaTxSignature,
  // Gas Budget
  getGasBudget,
  chargeGas,
  estimateGasCostUSD,
  hasEnoughBudget,
  getFormattedBudget,
  // Events
  subscribeTips,
  subscribeBadges,
  fetchPastTips,
  type TipEvent,
  type BadgeEvent,
  // VERY Token
  getVeryTokenInfo,
  transferVeryTokens,
  approveVeryTokens,
  getVeryTokenAllowance,
  hasEnoughAllowance,
  transferFromVeryTokens,
  getVeryTokenContract,
  type TokenInfo,
  type TransferResult,
  type ApproveResult,
  // Config
  CONTRACTS,
  API_ENDPOINTS,
  FEATURES
};

