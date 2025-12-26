/**
 * VERY Chain Configuration
 * Official RPC: https://rpc.verylabs.io
 * Chain ID: 4613
 * Currency: VERY
 * 
 * Reference: https://wp.verylabs.io/verychain
 */
export const VERY_CHAIN_CONFIG = {
  chainId: '0x1205', // 4613 in hex
  chainIdDecimal: 4613,
  chainName: 'VERY Chain',
  nativeCurrency: {
    name: 'VERY',
    symbol: 'VERY',
    decimals: 18
  },
  rpcUrls: ['https://rpc.verylabs.io'],
  blockExplorerUrls: ['https://explorer.very.network']
} as const;

/**
 * VERY Chain network configuration for wallet connection
 * Compatible with MetaMask, Wepin, and other EVM wallets
 */
export const VERY_CHAIN_NETWORK = {
  ...VERY_CHAIN_CONFIG,
  // Additional metadata for wallet integration
  iconUrls: ['https://verylabs.io/favicon.ico'],
} as const;


