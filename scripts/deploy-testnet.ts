/**
 * Deploy TipRouter to Testnet
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-testnet.ts --network veryTestnet
 * 
 * Environment variables:
 *   RELAYER_SIGNER - Address of relayer signer (required)
 *   PRIVATE_KEY - Deployer private key (required)
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Get relayer signer from env or use deployer address for demo
  const relayerSigner = process.env.RELAYER_SIGNER || deployer.address;
  
  console.log("🚀 Deploying TipRouter to testnet...");
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Relayer signer:", relayerSigner);
  
  // Check if deployer has enough balance
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Warning: Deployer balance is low. You may need testnet ETH.");
  }
  
  const TipRouter = await ethers.getContractFactory("TipRouter");
  console.log("\n📝 Deploying contract...");
  
  const tipRouter = await TipRouter.deploy(relayerSigner);
  await tipRouter.waitForDeployment();
  const address = await tipRouter.getAddress();
  
  console.log("\n✅ TipRouter deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract address:", address);
  console.log("Relayer signer:", await tipRouter.relayerSigner());
  console.log("Deployer:", deployer.address);
  
  // Verify contract info
  const info = await tipRouter.contractInfo();
  console.log("\nContract Info:");
  console.log("  Version:", info.version.toString());
  console.log("  Relayer:", info.relayer);
  console.log("  Total Tips:", info.totalTipsCount.toString());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  console.log("\n📋 Next steps:");
  console.log("1. Update relayer/.env with CONTRACT_ADDRESS=" + address);
  console.log("2. Update .env.local with VITE_APP_CONTRACT_ADDRESS=" + address);
  console.log("3. Restart relayer service");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

