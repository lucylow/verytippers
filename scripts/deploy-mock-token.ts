import { ethers } from "hardhat";

/**
 * Deploy MockERC20 token for testing TipRouterFair
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-mock-token.ts --network verychain
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MockERC20 with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy MockERC20
  console.log("\n🚀 Deploying MockERC20...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy();

  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log("\n✅ MockERC20 deployed successfully!");
  console.log("  Address:", address);
  console.log("  Name:", await token.name());
  console.log("  Symbol:", await token.symbol());
  console.log("  Decimals:", await token.decimals());
  console.log("  Total Supply:", ethers.formatEther(await token.totalSupply()), "MOCK");

  // Mint some tokens to deployer for testing
  const mintAmount = ethers.parseEther("1000000");
  await token.mint(deployer.address, mintAmount);
  console.log("  Minted", ethers.formatEther(mintAmount), "MOCK to deployer");

  console.log("\n💾 Save this address for TipRouterFair deployment:");
  console.log("  VERY_TOKEN_ADDRESS=" + address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

