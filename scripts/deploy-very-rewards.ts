/**
 * Deploy VeryToken and VeryRewards Contracts
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-very-rewards.ts --network veryTestnet
 * 
 * Environment variables:
 *   REWARD_SIGNER - Address of reward signer (KMS-derived address, required)
 *   PRIVATE_KEY - Deployer private key (required)
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Get reward signer from env (should be KMS-derived address)
  const rewardSigner = process.env.REWARD_SIGNER || process.env.RELAYER_SIGNER || deployer.address;
  
  console.log("🚀 Deploying VeryToken and VeryRewards contracts...");
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Reward signer:", rewardSigner);
  
  // Check if deployer has enough balance
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Warning: Deployer balance is low. You may need testnet ETH.");
  }
  
  // Step 1: Deploy VeryToken
  console.log("\n📝 Step 1: Deploying VeryToken...");
  const VeryToken = await ethers.getContractFactory("VeryToken");
  const veryToken = await VeryToken.deploy(deployer.address); // Admin is deployer (can transfer to DAO later)
  await veryToken.waitForDeployment();
  const tokenAddress = await veryToken.getAddress();
  console.log("✅ VeryToken deployed to:", tokenAddress);
  
  // Step 2: Deploy VeryRewards
  console.log("\n📝 Step 2: Deploying VeryRewards...");
  const VeryRewards = await ethers.getContractFactory("VeryRewards");
  const veryRewards = await VeryRewards.deploy(tokenAddress, rewardSigner);
  await veryRewards.waitForDeployment();
  const rewardsAddress = await veryRewards.getAddress();
  console.log("✅ VeryRewards deployed to:", rewardsAddress);
  
  // Step 3: Grant MINTER_ROLE to VeryRewards contract
  console.log("\n📝 Step 3: Granting MINTER_ROLE to VeryRewards...");
  const MINTER_ROLE = await veryToken.MINTER_ROLE();
  const tx = await veryToken.grantRole(MINTER_ROLE, rewardsAddress);
  await tx.wait();
  console.log("✅ MINTER_ROLE granted to VeryRewards");
  
  // Step 4: Verify setup
  console.log("\n📝 Step 4: Verifying setup...");
  const hasRole = await veryToken.hasRole(MINTER_ROLE, rewardsAddress);
  if (!hasRole) {
    throw new Error("❌ MINTER_ROLE not properly granted!");
  }
  console.log("✅ VeryRewards has MINTER_ROLE");
  
  // Get contract info
  const rewardsInfo = await veryRewards.contractInfo();
  console.log("\n✅ Deployment complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("VeryToken Address:", tokenAddress);
  console.log("VeryRewards Address:", rewardsAddress);
  console.log("\nContract Info:");
  console.log("  Version:", rewardsInfo.version.toString());
  console.log("  Token:", rewardsInfo.token);
  console.log("  Signer:", rewardsInfo.signer);
  console.log("  Total Rewards:", rewardsInfo.totalRewards.toString());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  console.log("\n📋 Environment variables to add to .env:");
  console.log(`VERY_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`VERY_REWARDS_CONTRACT_ADDRESS=${rewardsAddress}`);
  console.log(`REWARD_SIGNER=${rewardSigner}`);
  console.log("\n📋 Frontend environment variables (.env.local):");
  console.log(`VITE_VERY_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`VITE_VERY_REWARDS_CONTRACT_ADDRESS=${rewardsAddress}`);
  console.log("\n⚠️  IMPORTANT: In production, use a KMS/HSM-derived address for REWARD_SIGNER!");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

