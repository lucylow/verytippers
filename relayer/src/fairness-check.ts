/**
 * Fairness Check Utility - Pre-validate tips before relayer submission
 * 
 * This module performs off-chain checks to prevent wasted gas on failed transactions.
 * All checks are also enforced on-chain, but pre-checking saves relayer costs.
 * 
 * Usage:
 *   import { canSubmitTip } from './fairness-check';
 *   const result = await canSubmitTip(provider, contractAddress, from, to, amount);
 *   if (!result.ok) {
 *     console.error('Tip rejected:', result.reason);
 *   }
 */

import { ethers } from 'ethers';

export interface FairnessCheckResult {
  ok: boolean;
  reason?: string;
  details?: {
    blacklisted?: boolean;
    exceedsPerTxCap?: boolean;
    exceedsDailyCap?: boolean;
    rateLimited?: boolean;
    selfTip?: boolean;
    dailySpent?: string;
    dailyCap?: string;
    timeUntilNextTip?: number;
  };
}

/**
 * Check if a tip can be submitted based on fairness rules
 * @param provider Ethereum provider
 * @param contractAddress TipRouterFair contract address
 * @param from Tipper address
 * @param to Recipient address
 * @param amount Tip amount (in wei, as BigInt or string)
 * @returns Check result with reason if rejected
 */
export async function canSubmitTip(
  provider: ethers.Provider,
  contractAddress: string,
  from: string,
  to: string,
  amount: bigint | string
): Promise<FairnessCheckResult> {
  try {
    // Load contract ABI (minimal for view functions)
    const abi = [
      'function blacklist(address) view returns (bool)',
      'function maxTipAmount() view returns (uint256)',
      'function baseDailyCap() view returns (uint256)',
      'function stakeMultiplier() view returns (uint256)',
      'function stakeBalance(address) view returns (uint256)',
      'function minIntervalSec() view returns (uint256)',
      'function lastTipAt(address) view returns (uint256)',
      'function dailySpent(address, uint256) view returns (uint256)',
      'function currentDay() view returns (uint256)',
      'function effectiveDailyCap(address) view returns (uint256)',
    ];

    const contract = new ethers.Contract(contractAddress, abi, provider);
    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;

    // 1) Blacklist check
    const [blockedFrom, blockedTo] = await Promise.all([
      contract.blacklist(from),
      contract.blacklist(to),
    ]);
    if (blockedFrom || blockedTo) {
      return {
        ok: false,
        reason: 'blacklisted',
        details: { blacklisted: true },
      };
    }

    // 2) Self-tip check
    if (from.toLowerCase() === to.toLowerCase()) {
      return {
        ok: false,
        reason: 'self-tip',
        details: { selfTip: true },
      };
    }

    // 3) Per-tx cap check
    const maxTipAmount = await contract.maxTipAmount();
    if (amountBigInt > maxTipAmount) {
      return {
        ok: false,
        reason: 'exceeds per-tx cap',
        details: {
          exceedsPerTxCap: true,
        },
      };
    }

    // 4) Daily cap check
    const currentDay = await contract.currentDay();
    const spentToday = await contract.dailySpent(from, currentDay);
    const effectiveCap = await contract.effectiveDailyCap(from);
    
    if (spentToday + amountBigInt > effectiveCap) {
      return {
        ok: false,
        reason: 'daily cap exceeded',
        details: {
          exceedsDailyCap: true,
          dailySpent: spentToday.toString(),
          dailyCap: effectiveCap.toString(),
        },
      };
    }

    // 5) Rate limiting (minimum interval)
    const lastTipAt = await contract.lastTipAt(from);
    const minInterval = await contract.minIntervalSec();
    const currentTime = Math.floor(Date.now() / 1000);
    const timeSinceLastTip = currentTime - Number(lastTipAt);
    const timeUntilNextTip = Number(minInterval) - timeSinceLastTip;

    if (timeUntilNextTip > 0) {
      return {
        ok: false,
        reason: 'rate-limited',
        details: {
          rateLimited: true,
          timeUntilNextTip,
        },
      };
    }

    // All checks passed
    return {
      ok: true,
      details: {
        dailySpent: spentToday.toString(),
        dailyCap: effectiveCap.toString(),
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      reason: `check failed: ${error.message || String(error)}`,
    };
  }
}

/**
 * Get user's current daily spending and cap information
 * @param provider Ethereum provider
 * @param contractAddress TipRouterFair contract address
 * @param user User address
 * @returns Daily spending info
 */
export async function getDailySpendingInfo(
  provider: ethers.Provider,
  contractAddress: string,
  user: string
): Promise<{
  spentToday: bigint;
  dailyCap: bigint;
  remaining: bigint;
  stakeBalance: bigint;
  lastTipAt: bigint;
  timeUntilNextTip: number;
}> {
  const abi = [
    'function dailySpent(address, uint256) view returns (uint256)',
    'function effectiveDailyCap(address) view returns (uint256)',
    'function stakeBalance(address) view returns (uint256)',
    'function lastTipAt(address) view returns (uint256)',
    'function minIntervalSec() view returns (uint256)',
    'function currentDay() view returns (uint256)',
  ];

  const contract = new ethers.Contract(contractAddress, abi, provider);
  const [currentDay, spentToday, dailyCap, stakeBalance, lastTipAt, minInterval] = await Promise.all([
    contract.currentDay(),
    contract.dailySpent(user, await contract.currentDay()),
    contract.effectiveDailyCap(user),
    contract.stakeBalance(user),
    contract.lastTipAt(user),
    contract.minIntervalSec(),
  ]);

  const currentTime = Math.floor(Date.now() / 1000);
  const timeSinceLastTip = currentTime - Number(lastTipAt);
  const timeUntilNextTip = Math.max(0, Number(minInterval) - timeSinceLastTip);

  return {
    spentToday: BigInt(spentToday.toString()),
    dailyCap: BigInt(dailyCap.toString()),
    remaining: BigInt(dailyCap.toString()) - BigInt(spentToday.toString()),
    stakeBalance: BigInt(stakeBalance.toString()),
    lastTipAt: BigInt(lastTipAt.toString()),
    timeUntilNextTip,
  };
}

