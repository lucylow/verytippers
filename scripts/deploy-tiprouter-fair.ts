import { ethers } from "hardhat";

/**
 * Deploy TipRouterFair contract
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-tiprouter-fair.ts --network verychain
 * 
 * Environment variables:
 *   RELAYER_SIGNER_ADDRESS - Address of relayer signer (KMS-derived)
 *   VERY_TOKEN_ADDRESS - Address of VERY ERC20 token
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TipRouterFair with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Get addresses from environment or use defaults for testing
  const relayerSigner = process.env.RELAYER_SIGNER_ADDRESS || deployer.address;
  const veryTokenAddress = process.env.VERY_TOKEN_ADDRESS;

  if (!veryTokenAddress) {
    console.error("❌ VERY_TOKEN_ADDRESS environment variable is required");
    console.log("💡 For testing, you can deploy a MockERC20 first:");
    console.log("   npx hardhat run scripts/deploy-mock-token.ts --network verychain");
    process.exit(1);
  }

  console.log("\n📋 Deployment Configuration:");
  console.log("  Relayer Signer:", relayerSigner);
  console.log("  VERY Token:", veryTokenAddress);
  console.log("  Network:", (await ethers.provider.getNetwork()).name);
  console.log("  Chain ID:", (await ethers.provider.getNetwork()).chainId);

  // Deploy TipRouterFair
  console.log("\n🚀 Deploying TipRouterFair...");
  const TipRouterFair = await ethers.getContractFactory("TipRouterFair");
  const tipRouter = await TipRouterFair.deploy(relayerSigner, veryTokenAddress);

  await tipRouter.waitForDeployment();
  const address = await tipRouter.getAddress();

  console.log("\n✅ TipRouterFair deployed successfully!");
  console.log("  Address:", address);
  console.log("  Transaction:", tipRouter.deploymentTransaction()?.hash);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const relayerSignerOnChain = await tipRouter.relayerSigner();
  const tokenOnChain = await tipRouter.token();
  const version = await tipRouter.contractInfo();

  console.log("  Relayer Signer (on-chain):", relayerSignerOnChain);
  console.log("  Token (on-chain):", tokenOnChain);
  console.log("  Version:", version[0].toString());

  // Display default parameters
  console.log("\n📊 Default Fairness Parameters:");
  console.log("  Min Interval:", (await tipRouter.minIntervalSec()).toString(), "seconds");
  console.log("  Max Tip Amount:", ethers.formatEther(await tipRouter.maxTipAmount()), "VERY");
  console.log("  Base Daily Cap:", ethers.formatEther(await tipRouter.baseDailyCap()), "VERY");
  console.log("  Stake Multiplier:", (await tipRouter.stakeMultiplier()).toString());
  console.log("  Unstake Delay:", (await tipRouter.unstakeDelay()).toString(), "seconds");

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    contractAddress: address,
    relayerSigner,
    veryTokenAddress,
    deployer: deployer.address,
    deploymentTx: tipRouter.deploymentTransaction()?.hash,
    timestamp: new Date().toISOString(),
  };

  console.log("\n💾 Deployment Info (save this):");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Instructions
  console.log("\n📝 Next Steps:");
  console.log("  1. Update .env with TIPROUTER_FAIR_ADDRESS=" + address);
  console.log("  2. Update relayer configuration to use new contract");
  console.log("  3. Update frontend contract addresses");
  console.log("  4. (Optional) Adjust fairness parameters:");
  console.log("     tipRouter.setCaps(minInterval, maxTipAmount, baseDailyCap, stakeMultiplier)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

