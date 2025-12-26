/**
 * VERY Token ERC-20 Operations
 * Direct interaction with the VERY token contract
 */

import { ethers } from 'ethers';
import { CONTRACTS, FEATURES } from './config';
import { ensureVeryNetwork } from './network';

const VERY_TOKEN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

export interface TransferResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface ApproveResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Gets the VERY token contract instance
 */
export function getVeryTokenContract(
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(
    CONTRACTS.veryToken.address,
    VERY_TOKEN_ABI,
    signerOrProvider
  );
}

/**
 * Gets VERY token information (name, symbol, decimals, total supply)
 */
export async function getVeryTokenInfo(): Promise<TokenInfo> {
  try {
    if (!window.ethereum) {
      throw new Error('No wallet provider');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const tokenContract = getVeryTokenContract(provider);

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.totalSupply()
    ]);

    return {
      address: CONTRACTS.veryToken.address,
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatUnits(totalSupply, Number(decimals))
    };
  } catch (error: any) {
    console.error('Failed to fetch token info:', error);
    // Return mock info if real query fails
    return {
      address: CONTRACTS.veryToken.address,
      name: 'Very Token',
      symbol: 'VERY',
      decimals: 18,
      totalSupply: '1000000000' // 1 billion
    };
  }
}

/**
 * Transfers VERY tokens directly
 */
export async function transferVeryTokens(
  to: string,
  amount: number,
  signer: ethers.JsonRpcSigner
): Promise<TransferResult> {
  try {
    // Validate inputs
    if (!ethers.isAddress(to)) {
      return {
        success: false,
        error: 'Invalid recipient address'
      };
    }

    if (amount <= 0 || !isFinite(amount)) {
      return {
        success: false,
        error: 'Invalid amount'
      };
    }

    // Ensure correct network
    await ensureVeryNetwork();

    // Get token contract with signer
    const tokenContract = getVeryTokenContract(signer);

    // Get decimals
    const decimals = await tokenContract.decimals();
    const amountInWei = ethers.parseUnits(amount.toString(), Number(decimals));

    // Check balance
    const balance = await tokenContract.balanceOf(await signer.getAddress());
    if (balance < amountInWei) {
      return {
        success: false,
        error: `Insufficient balance. You have ${ethers.formatUnits(balance, Number(decimals))} VERY`
      };
    }

    // Send transaction
    const tx = await tokenContract.transfer(to, amountInWei);
    
    // Wait for confirmation
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.hash
    };
  } catch (error: any) {
    console.error('Transfer error:', error);
    
    // Handle user rejection
    if (error.code === 4001 || error.message?.includes('reject')) {
      return {
        success: false,
        error: 'Transaction rejected by user'
      };
    }

    return {
      success: false,
      error: error.message || 'Transfer failed'
    };
  }
}

/**
 * Approves VERY tokens for a spender (e.g., tip contract)
 */
export async function approveVeryTokens(
  spender: string,
  amount: number | 'max',
  signer: ethers.JsonRpcSigner
): Promise<ApproveResult> {
  try {
    // Validate inputs
    if (!ethers.isAddress(spender)) {
      return {
        success: false,
        error: 'Invalid spender address'
      };
    }

    // Ensure correct network
    await ensureVeryNetwork();

    // Get token contract with signer
    const tokenContract = getVeryTokenContract(signer);

    // Get decimals
    const decimals = await tokenContract.decimals();
    
    // Calculate amount
    let amountInWei: bigint;
    if (amount === 'max') {
      amountInWei = ethers.MaxUint256;
    } else {
      if (amount <= 0 || !isFinite(amount)) {
        return {
          success: false,
          error: 'Invalid amount'
        };
      }
      amountInWei = ethers.parseUnits(amount.toString(), Number(decimals));
    }

    // Send transaction
    const tx = await tokenContract.approve(spender, amountInWei);
    
    // Wait for confirmation
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.hash
    };
  } catch (error: any) {
    console.error('Approve error:', error);
    
    // Handle user rejection
    if (error.code === 4001 || error.message?.includes('reject')) {
      return {
        success: false,
        error: 'Transaction rejected by user'
      };
    }

    return {
      success: false,
      error: error.message || 'Approve failed'
    };
  }
}

/**
 * Gets the allowance of VERY tokens for a spender
 */
export async function getVeryTokenAllowance(
  owner: string,
  spender: string
): Promise<{ allowance: string; rawAllowance: bigint }> {
  try {
    if (!window.ethereum) {
      throw new Error('No wallet provider');
    }

    if (!ethers.isAddress(owner) || !ethers.isAddress(spender)) {
      throw new Error('Invalid address');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const tokenContract = getVeryTokenContract(provider);

    const decimals = await tokenContract.decimals();
    const rawAllowance = await tokenContract.allowance(owner, spender);
    const allowance = ethers.formatUnits(rawAllowance, Number(decimals));

    return {
      allowance,
      rawAllowance
    };
  } catch (error: any) {
    console.error('Get allowance error:', error);
    return {
      allowance: '0',
      rawAllowance: 0n
    };
  }
}

/**
 * Checks if user has approved enough tokens for a spender
 */
export async function hasEnoughAllowance(
  owner: string,
  spender: string,
  requiredAmount: number
): Promise<boolean> {
  try {
    const { rawAllowance } = await getVeryTokenAllowance(owner, spender);
    
    if (!window.ethereum) {
      return false;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const tokenContract = getVeryTokenContract(provider);
    const decimals = await tokenContract.decimals();
    const requiredAmountInWei = ethers.parseUnits(
      requiredAmount.toString(),
      Number(decimals)
    );

    return rawAllowance >= requiredAmountInWei;
  } catch (error) {
    console.error('Check allowance error:', error);
    return false;
  }
}

/**
 * Transfers VERY tokens from one address to another (requires approval)
 */
export async function transferFromVeryTokens(
  from: string,
  to: string,
  amount: number,
  signer: ethers.JsonRpcSigner
): Promise<TransferResult> {
  try {
    // Validate inputs
    if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
      return {
        success: false,
        error: 'Invalid address'
      };
    }

    if (amount <= 0 || !isFinite(amount)) {
      return {
        success: false,
        error: 'Invalid amount'
      };
    }

    // Ensure correct network
    await ensureVeryNetwork();

    // Get token contract with signer
    const tokenContract = getVeryTokenContract(signer);

    // Get decimals
    const decimals = await tokenContract.decimals();
    const amountInWei = ethers.parseUnits(amount.toString(), Number(decimals));

    // Check allowance
    const allowance = await tokenContract.allowance(from, await signer.getAddress());
    if (allowance < amountInWei) {
      return {
        success: false,
        error: 'Insufficient allowance. Please approve more tokens first.'
      };
    }

    // Send transaction
    const tx = await tokenContract.transferFrom(from, to, amountInWei);
    
    // Wait for confirmation
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.hash
    };
  } catch (error: any) {
    console.error('TransferFrom error:', error);
    
    // Handle user rejection
    if (error.code === 4001 || error.message?.includes('reject')) {
      return {
        success: false,
        error: 'Transaction rejected by user'
      };
    }

    return {
      success: false,
      error: error.message || 'TransferFrom failed'
    };
  }
}

