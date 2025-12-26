// scripts/deploy.js - Deployment script
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying TipRouter with relayer:", process.env.RELAYER_SIGNER);
  
  const TipRouter = await ethers.getContractFactory("TipRouter");
  const tipRouter = await TipRouter.deploy(process.env.RELAYER_SIGNER);
  
  await tipRouter.deployed();
  
  console.log("TipRouter deployed to:", tipRouter.address);
  console.log("Relayer signer:", await tipRouter.relayerSigner());
  console.log("Deployer:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


