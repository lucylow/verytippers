import { expect } from "chai";
import { ethers } from "hardhat";
import { NFT, NFTMarketplace } from "../typechain-types";

describe("NFT Marketplace", function () {
  let nft: NFT;
  let marketplace: NFTMarketplace;
  let owner: any;
  let seller: any;
  let buyer: any;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();

    // Deploy NFT contract
    const NFT = await ethers.getContractFactory("NFT");
    nft = await NFT.deploy("Test NFT", "TNFT");
    await nft.waitForDeployment();

    // Deploy Marketplace contract
    const Marketplace = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();

    // Set marketplace as admin (for testing)
    await nft.setAdmin(await marketplace.getAddress());
  });

  describe("NFT Contract", function () {
    it("Should mint NFT with tokenURI", async function () {
      const tokenURI = "ipfs://QmTest123";
      const tx = await nft.mintTo(seller.address, tokenURI);
      const receipt = await tx.wait();

      // Check event
      const event = receipt?.logs.find(
        (log: any) => nft.interface.parseLog(log)?.name === "Minted"
      );
      expect(event).to.not.be.undefined;

      // Check token ownership
      expect(await nft.ownerOf(1)).to.equal(seller.address);
      expect(await nft.tokenURI(1)).to.equal(tokenURI);
    });

    it("Should only allow admin to mint", async function () {
      await expect(
        nft.connect(buyer).mintTo(buyer.address, "ipfs://test")
      ).to.be.revertedWith("only admin");
    });
  });

  describe("Marketplace Contract", function () {
    beforeEach(async function () {
      // Mint an NFT to seller
      const tokenURI = "ipfs://QmTest123";
      await nft.mintTo(seller.address, tokenURI);
    });

    it("Should list NFT for sale", async function () {
      const tokenId = 1;
      const price = ethers.parseEther("1.0");

      // Approve marketplace
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);

      // List NFT
      const tx = await marketplace.connect(seller).listItem(
        await nft.getAddress(),
        tokenId,
        price
      );
      const receipt = await tx.wait();

      // Check event
      const event = receipt?.logs.find(
        (log: any) => marketplace.interface.parseLog(log)?.name === "Listed"
      );
      expect(event).to.not.be.undefined;

      // Check listing
      const listing = await marketplace.getListing(1);
      expect(listing.active).to.be.true;
      expect(listing.price).to.equal(price);
      expect(listing.seller).to.equal(seller.address);
    });

    it("Should allow purchase of listed NFT", async function () {
      const tokenId = 1;
      const price = ethers.parseEther("1.0");

      // Approve and list
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
      await marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, price);

      // Purchase
      const tx = await marketplace.connect(buyer).buy(1, { value: price });
      await tx.wait();

      // Check ownership transferred
      expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);

      // Check listing is inactive
      const listing = await marketplace.getListing(1);
      expect(listing.active).to.be.false;
    });

    it("Should allow seller to cancel listing", async function () {
      const tokenId = 1;
      const price = ethers.parseEther("1.0");

      // Approve and list
      await nft.connect(seller).approve(await marketplace.getAddress(), tokenId);
      await marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, price);

      // Cancel
      await marketplace.connect(seller).cancelListing(1);

      // Check listing is inactive
      const listing = await marketplace.getListing(1);
      expect(listing.active).to.be.false;

      // Check NFT returned to seller
      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);
    });
  });
});

