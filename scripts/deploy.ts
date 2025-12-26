import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const relayerSigner = process.env.RELAYER_SIGNER;
  if (!relayerSigner) {
    throw new Error("RELAYER_SIGNER environment variable is not set");
  }
  
  console.log("Deploying TipRouter with relayer:", relayerSigner);
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  const TipRouter = await ethers.getContractFactory("TipRouter");
  const tipRouter = await TipRouter.deploy(relayerSigner);
  
  await tipRouter.waitForDeployment();
  const address = await tipRouter.getAddress();
  
  console.log("\n✅ TipRouter deployed successfully!");
  console.log("Contract address:", address);
  console.log("Relayer signer:", await tipRouter.relayerSigner());
  console.log("Deployer:", deployer.address);
  
  // Verify contract info
  const info = await tipRouter.contractInfo();
  console.log("\nContract Info:");
  console.log("  Version:", info.version.toString());
  console.log("  Relayer:", info.relayer);
  console.log("  Total Tips:", info.totalTipsCount.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

