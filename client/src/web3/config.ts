/**
 * VERY Chain Configuration
 * Official RPC: https://rpc.verylabs.io
 * Chain ID: 4613
 * Currency: VERY
 * 
 * Reference: https://wp.verylabs.io/verychain
 */
export const VERY_CHAIN = {
  chainId: 4613, // Official VERY Chain ID
  chainName: "VERY Chain",
  rpcUrls: ["https://rpc.verylabs.io"],
  blockExplorerUrls: ["https://explorer.very.network"],
  nativeCurrency: {
    name: "VERY",
    symbol: "VERY",
    decimals: 18
  }
};

/**
 * VERY Chain Testnet (if available)
 * Fallback configuration for development
 */
export const VERY_TESTNET = {
  chainId: 1337, // Replace with official testnet ID when available
  chainName: "VERY Testnet",
  rpcUrls: ["https://rpc.testnet.very.network"],
  blockExplorerUrls: ["https://explorer.testnet.very.network"],
  nativeCurrency: {
    name: "VERY",
    symbol: "VERY",
    decimals: 18
  }
};

export const CONTRACTS = {
  tipRouter: {
    address: "0xMockTipRouter000000000000000000000001",
    abi: [
      "function submitTip(tuple(address to,uint256 amount,string cid,uint256 nonce) metaTx) external",
      "event TipSubmitted(address indexed from,address indexed to,uint256 amount,string cid)"
    ]
  }
};

// Environment flags
export const FEATURES = {
  ENABLE_GAS_SPONSORSHIP: process.env.VITE_ENABLE_GAS_SPONSORSHIP !== "false",
  ENABLE_MOCK_MODE: process.env.VITE_ENABLE_MOCK_MODE === "true",
  ENABLE_EVENT_LISTENING: process.env.VITE_ENABLE_EVENT_LISTENING !== "false"
};


