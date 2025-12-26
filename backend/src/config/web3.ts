import { ethers } from 'ethers';
import { config } from './app';

export const VERY_CHAIN_CONFIG = {
  // Network
  CHAIN_ID: config.VERY_CHAIN_ID,
  RPC_URL: config.VERY_CHAIN_RPC,
  EXPLORER_URL: 'https://explorer.very.network',
  CURRENCY: {
    name: 'VERY',
    symbol: 'VERY',
    decimals: 18
  },
  
  // Gas Settings
  GAS_LIMIT_MULTIPLIER: 1.2, // 20% buffer
  MAX_GAS_LIMIT: 3000000,
  PRIORITY_GAS_PRICE_MULTIPLIER: 1.1, // 10% priority fee
  
  // Transaction Settings
  CONFIRMATION_BLOCKS: 2,
  TIMEOUT_MS: 120000, // 2 minutes
  
  // Contract ABIs (truncated for brevity)
  TIP_CONTRACT_ABI: [
    "function tip(address recipient, address token, uint256 amount, string memory messageHash) external",
    "function withdraw(address token) external",
    "function supportedTokens(address token) external view returns (bool)",
    "function totalTipsSent(address user) external view returns (uint256)",
    "function totalTipsReceived(address user) external view returns (uint256)",
    "function tokenBalances(address user, address token) external view returns (uint256)",
    "function getTipCount() external view returns (uint256)",
    "event TipSent(address indexed from, address indexed to, address token, uint256 amount, string messageHash, uint256 tipId)"
  ],
  
  BADGE_CONTRACT_ABI: [
    "function mintBadge(address user, uint256 badgeId) external",
    "function hasBadge(address user, uint256 badgeId) external view returns (bool)",
    "function getUserBadges(address user) external view returns (uint256[])",
    "event BadgeMinted(address indexed user, uint256 badgeId, string badgeName)"
  ],
  
  // Contract Addresses
  CONTRACTS: {
    TIP: config.TIP_CONTRACT_ADDRESS,
    BADGE_FACTORY: config.BADGE_CONTRACT_ADDRESS,
    VERY_TOKEN: config.VERY_TOKEN_ADDRESS,
    USDC_TOKEN: config.USDC_TOKEN_ADDRESS,
  },
  
  // Token Configurations
  TOKENS: {
    [config.VERY_TOKEN_ADDRESS]: {
      symbol: 'VERY',
      decimals: 18,
      name: 'Very Token',
      minTipAmount: ethers.parseUnits('0.1', 18), // 0.1 VERY
      maxTipAmount: ethers.parseUnits('1000', 18), // 1000 VERY
    },
    [config.USDC_TOKEN_ADDRESS]: {
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      minTipAmount: ethers.parseUnits('0.1', 6), // $0.10
      maxTipAmount: ethers.parseUnits('1000', 6), // $1000
    }
  }
};

// Web3 Provider Factory
export class Web3ProviderFactory {
  private static provider: ethers.JsonRpcProvider;
  private static signer: ethers.Wallet;
  
  static getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      this.provider = new ethers.JsonRpcProvider(
        VERY_CHAIN_CONFIG.RPC_URL,
        VERY_CHAIN_CONFIG.CHAIN_ID
      );
    }
    return this.provider;
  }
  
  static getSigner(): ethers.Wallet {
    if (!this.signer) {
      const provider = this.getProvider();
      if (!config.RELAYER_PRIVATE_KEY) {
        throw new Error('RELAYER_PRIVATE_KEY is not set');
      }
      this.signer = new ethers.Wallet(config.RELAYER_PRIVATE_KEY, provider);
    }
    return this.signer;
  }
  
  static getContract(address: string, abi: any[]): ethers.Contract {
    const signer = this.getSigner();
    return new ethers.Contract(address, abi, signer);
  }
  
  static getTipContract(): ethers.Contract {
    if (!VERY_CHAIN_CONFIG.CONTRACTS.TIP) {
      throw new Error('TIP_CONTRACT_ADDRESS is not set');
    }
    return this.getContract(
      VERY_CHAIN_CONFIG.CONTRACTS.TIP,
      VERY_CHAIN_CONFIG.TIP_CONTRACT_ABI
    );
  }
  
  static getBadgeContract(): ethers.Contract {
    if (!VERY_CHAIN_CONFIG.CONTRACTS.BADGE_FACTORY) {
      throw new Error('BADGE_CONTRACT_ADDRESS is not set');
    }
    return this.getContract(
      VERY_CHAIN_CONFIG.CONTRACTS.BADGE_FACTORY,
      VERY_CHAIN_CONFIG.BADGE_CONTRACT_ABI
    );
  }
}

