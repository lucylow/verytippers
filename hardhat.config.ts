import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
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
