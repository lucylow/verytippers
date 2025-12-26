import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    // VERY Chain Mainnet
    // Official RPC: https://rpc.verylabs.io
    // Chain ID: 4613
    // Reference: https://wp.verylabs.io/verychain
    verychain: {
      url: process.env.VERY_CHAIN_RPC_URL || "https://rpc.verylabs.io",
      chainId: 4613,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000,
      timeout: 120000
    },
    // Legacy network configs (kept for backward compatibility)
    very: {
      url: "https://rpc.verylabs.io",
      chainId: 4613,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000
    },
    // Testnet (if available)
    veryTestnet: {
      url: process.env.VERY_TESTNET_RPC_URL || "https://rpc.testnet.very.network",
      chainId: parseInt(process.env.VERY_TESTNET_CHAIN_ID || "1337"),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
