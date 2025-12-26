/**
 * VERY ERC-20 Balance Fetching
 * Supports both real blockchain queries and mock fallback
 */

import { ethers } from 'ethers';
import { CONTRACTS, FEATURES } from './config';

const VERY_ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: number;
  rawBalance: bigint;
  decimals: number;
  formatted: string;
}

/**
 * Gets VERY token balance for an address
 * Falls back to mock balance if blockchain query fails
 */
export async function getVeryBalance(address: string): Promise<TokenBalance> {
  if (!address || !ethers.isAddress(address)) {
    throw new Error('Invalid address provided');
  }

  // Use mock mode if enabled
  if (FEATURES.ENABLE_MOCK_MODE) {
    return getMockVeryBalance(address);
  }

  try {
    if (!window.ethereum) {
      throw new Error('No wallet provider');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const tokenContract = new ethers.Contract(
      CONTRACTS.veryToken.address,
      VERY_ERC20_ABI,
      provider
    );

    const [rawBalance, decimals, symbol, name] = await Promise.all([
      tokenContract.balanceOf(address),
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name()
    ]);

    const balance = Number(ethers.formatUnits(rawBalance, decimals));

    return {
      address: CONTRACTS.veryToken.address,
      symbol,
      name,
      balance,
      rawBalance,
      decimals: Number(decimals),
      formatted: formatBalance(balance)
    };
  } catch (error) {
    console.warn('Failed to fetch real balance, using mock:', error);
    return getMockVeryBalance(address);
  }
}

/**
 * Gets native VERY balance (ETH equivalent)
 */
export async function getNativeBalance(address: string): Promise<number> {
  if (!address || !ethers.isAddress(address)) {
    throw new Error('Invalid address provided');
  }

  try {
    if (!window.ethereum) {
      return getMockNativeBalance(address);
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(address);
    return Number(ethers.formatEther(balance));
  } catch (error) {
    console.warn('Failed to fetch native balance, using mock:', error);
    return getMockNativeBalance(address);
  }
}

/**
 * Gets multiple token balances at once
 */
export async function getMultipleBalances(
  address: string,
  tokenAddresses: string[]
): Promise<TokenBalance[]> {
  const balances = await Promise.all(
    tokenAddresses.map(async (tokenAddress) => {
      try {
        if (!window.ethereum) {
          throw new Error('No wallet provider');
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const tokenContract = new ethers.Contract(
          tokenAddress,
          VERY_ERC20_ABI,
          provider
        );

        const [rawBalance, decimals, symbol, name] = await Promise.all([
          tokenContract.balanceOf(address),
          tokenContract.decimals(),
          tokenContract.symbol(),
          tokenContract.name()
        ]);

        const balance = Number(ethers.formatUnits(rawBalance, decimals));

        return {
          address: tokenAddress,
          symbol,
          name,
          balance,
          rawBalance,
          decimals: Number(decimals),
          formatted: formatBalance(balance)
        };
      } catch (error) {
        console.warn(`Failed to fetch balance for ${tokenAddress}:`, error);
        return {
          address: tokenAddress,
          symbol: 'UNKNOWN',
          name: 'Unknown Token',
          balance: 0,
          rawBalance: 0n,
          decimals: 18,
          formatted: '0.00'
        };
      }
    })
  );

  return balances;
}

/**
 * Mock balance generator (for hackathon demos)
 * Generates consistent mock balances based on address
 */
function getMockVeryBalance(address: string): TokenBalance {
  // Generate consistent mock balance based on address
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mockBalance = 42.0 + (hash % 100) / 10; // Between 42.0 and 52.0

  return {
    address: CONTRACTS.veryToken.address,
    symbol: 'VERY',
    name: 'Very Token',
    balance: mockBalance,
    rawBalance: ethers.parseEther(mockBalance.toString()),
    decimals: 18,
    formatted: formatBalance(mockBalance)
  };
}

function getMockNativeBalance(address: string): number {
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 0.5 + (hash % 50) / 100; // Between 0.5 and 1.0
}

/**
 * Formats balance for display
 */
function formatBalance(balance: number, decimals: number = 4): string {
  if (balance === 0) return '0.00';
  if (balance < 0.0001) return '< 0.0001';
  if (balance >= 1000000) return `${(balance / 1000000).toFixed(2)}M`;
  if (balance >= 1000) return `${(balance / 1000).toFixed(2)}K`;
  return balance.toFixed(decimals);
}

/**
 * Watches balance changes for an address
 */
export function watchBalance(
  address: string,
  callback: (balance: TokenBalance) => void,
  interval: number = 5000
): () => void {
  let isActive = true;

  const checkBalance = async () => {
    if (!isActive) return;
    try {
      const balance = await getVeryBalance(address);
      callback(balance);
    } catch (error) {
      console.error('Balance watch error:', error);
    }
  };

  // Initial check
  checkBalance();

  // Set up interval
  const intervalId = setInterval(checkBalance, interval);

  // Return cleanup function
  return () => {
    isActive = false;
    clearInterval(intervalId);
  };
}

