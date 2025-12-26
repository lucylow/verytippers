import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy NFT contract
  console.log("\n📦 Deploying NFT contract...");
  const NFT = await ethers.getContractFactory("NFT");
  const nft = await NFT.deploy("VeryTippers NFT", "VTIP");
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("✅ NFT deployed to:", nftAddress);

  // Deploy Marketplace contract
  console.log("\n📦 Deploying Marketplace contract...");
  const Marketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Set marketplace as admin for NFT contract (optional, for relayer)
  console.log("\n🔧 Setting up permissions...");
  const relayerAddress = process.env.RELAYER_SIGNER || deployer.address;
  await nft.setAdmin(relayerAddress);
  console.log("✅ NFT admin set to:", relayerAddress);

  // Summary
  console.log("\n📋 Deployment Summary:");
  console.log("====================");
  console.log("NFT Contract:", nftAddress);
  console.log("Marketplace Contract:", marketplaceAddress);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("\n💡 Add these to your .env file:");
  console.log(`NFT_CONTRACT_ADDRESS=${nftAddress}`);
  console.log(`MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

