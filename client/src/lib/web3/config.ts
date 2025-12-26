/**
 * VERY Chain Configuration
 * Supports both testnet and mainnet configurations
 */

export const VERY_TESTNET = {
  chainId: 1337, // Testnet Chain ID (update with official testnet ID when available)
  chainName: 'VERY Chain Testnet',
  rpcUrls: ['https://rpc.testnet.very.network'],
  blockExplorerUrls: ['https://explorer.testnet.very.network'],
  nativeCurrency: {
    name: 'VERY',
    symbol: 'VERY',
    decimals: 18
  }
};

export const VERY_MAINNET = {
  chainId: 4613, // Official VERY Chain Mainnet ID
  chainName: 'VERY Chain',
  rpcUrls: ['https://rpc.verylabs.io'],
  blockExplorerUrls: ['https://explorer.very.network'],
  nativeCurrency: {
    name: 'VERY',
    symbol: 'VERY',
    decimals: 18
  }
};

// Default to testnet - will be overridden by NetworkContext
export const VERY_CHAIN = VERY_TESTNET;

// Contract addresses (mock addresses for hackathon - replace with deployed addresses)
export const CONTRACTS = {
  tipRouter: {
    address: import.meta.env.VITE_TIP_CONTRACT_ADDRESS || '0xMockTipRouter000000000000000000000001',
    abi: [
      'function tip(address to, uint256 amount, string memory cid, uint256 nonce, uint256 deadline) external',
      'function totalTipsSent(address) view returns (uint256)',
      'function totalTipsReceived(address) view returns (uint256)',
      'event TipSubmitted(address indexed from, address indexed to, uint256 amount, string cid, uint256 tipId)'
    ]
  },
  veryToken: {
    address: import.meta.env.VITE_VERY_TOKEN_ADDRESS || '0xMockVeryToken00000000000000000000001',
    abi: [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function name() view returns (string)',
      'function transfer(address to, uint256 amount) external returns (bool)',
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) view returns (uint256)'
    ]
  },
  badgeFactory: {
    address: import.meta.env.VITE_BADGE_CONTRACT_ADDRESS || '0xMockBadgeFactory0000000000000000000001',
    abi: [
      'function mintBadge(address user, uint256 badgeId) external',
      'function hasBadge(address user, uint256 badgeId) view returns (bool)',
      'event BadgeMinted(address indexed user, uint256 badgeId, string badgeName)'
    ]
  }
};

// API endpoints
export const API_ENDPOINTS = {
  submitTip: '/api/v1/tip',
  relayerTip: '/api/web3/relayer/tip',
  getBalance: '/api/web3/balance'
};

// Environment flags
export const FEATURES = {
  ENABLE_GAS_SPONSORSHIP: import.meta.env.VITE_ENABLE_GAS_SPONSORSHIP !== 'false',
  ENABLE_MOCK_MODE: import.meta.env.VITE_ENABLE_MOCK_MODE === 'true',
  ENABLE_EVENT_LISTENING: import.meta.env.VITE_ENABLE_EVENT_LISTENING !== 'false'
};

