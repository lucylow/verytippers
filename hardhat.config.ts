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
    very: {
      url: "https://rpc.verychain.org",
      chainId: 8888,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000
    },
    veryTestnet: {
      url: "https://rpc.testnet.verychain.org",
      chainId: 8889,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    verychain: {
      url: process.env.VERY_CHAIN_RPC_URL || "http://localhost:8545",
      accounts: process.env.SPONSOR_PRIVATE_KEY ? [process.env.SPONSOR_PRIVATE_KEY] : [],
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
