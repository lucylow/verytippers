import { expect } from "chai";
import { ethers } from "hardhat";
import { AdPool } from "../typechain-types";

describe("AdPool", function () {
  let adPool: AdPool;
  let owner: any;
  let recipient: any;
  let otherAccount: any;

  beforeEach(async function () {
    [owner, recipient, otherAccount] = await ethers.getSigners();

    const AdPoolFactory = await ethers.getContractFactory("AdPool");
    adPool = await AdPoolFactory.deploy();
    await adPool.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await adPool.owner()).to.equal(owner.address);
    });

    it("Should have zero balance initially", async function () {
      expect(await adPool.getBalance()).to.equal(0);
    });
  });

  describe("Receiving funds", function () {
    it("Should receive ETH via receive()", async function () {
      const amount = ethers.parseEther("1.0");
      
      await expect(
        owner.sendTransaction({
          to: await adPool.getAddress(),
          value: amount,
        })
      ).to.emit(adPool, "PoolFunded")
        .withArgs(owner.address, amount);

      expect(await adPool.getBalance()).to.equal(amount);
    });

    it("Should receive ETH via fallback()", async function () {
      const amount = ethers.parseEther("0.5");
      
      // Send transaction with data to trigger fallback
      await expect(
        owner.sendTransaction({
          to: await adPool.getAddress(),
          value: amount,
          data: "0x1234",
        })
      ).to.emit(adPool, "PoolFunded")
        .withArgs(owner.address, amount);

      expect(await adPool.getBalance()).to.equal(amount);
    });
  });

  describe("Payout", function () {
    beforeEach(async function () {
      // Fund the pool
      await owner.sendTransaction({
        to: await adPool.getAddress(),
        value: ethers.parseEther("2.0"),
      });
    });

    it("Should allow owner to payout to recipient", async function () {
      const amount = ethers.parseEther("1.0");
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);

      await expect(adPool.payout(recipient.address, amount))
        .to.emit(adPool, "Payout")
        .withArgs(recipient.address, amount);

      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(amount);
      expect(await adPool.getBalance()).to.equal(ethers.parseEther("1.0"));
    });

    it("Should reject payout from non-owner", async function () {
      const amount = ethers.parseEther("1.0");
      
      await expect(
        adPool.connect(otherAccount).payout(recipient.address, amount)
      ).to.be.revertedWith("AdPool: only owner");
    });

    it("Should reject payout if insufficient balance", async function () {
      const amount = ethers.parseEther("3.0");
      
      await expect(
        adPool.payout(recipient.address, amount)
      ).to.be.revertedWith("AdPool: insufficient balance");
    });

    it("Should reject payout to zero address", async function () {
      const amount = ethers.parseEther("1.0");
      
      await expect(
        adPool.payout(ethers.ZeroAddress, amount)
      ).to.be.revertedWith("AdPool: invalid recipient");
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {
      // Fund the pool
      await owner.sendTransaction({
        to: await adPool.getAddress(),
        value: ethers.parseEther("1.5"),
      });
    });

    it("Should allow owner to withdraw", async function () {
      const amount = ethers.parseEther("1.0");
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await adPool.withdraw(amount);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      await expect(tx)
        .to.emit(adPool, "Payout")
        .withArgs(owner.address, amount);

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      // Account for gas costs
      expect(ownerBalanceAfter - ownerBalanceBefore + gasUsed).to.equal(amount);
      expect(await adPool.getBalance()).to.equal(ethers.parseEther("0.5"));
    });

    it("Should reject withdraw from non-owner", async function () {
      const amount = ethers.parseEther("1.0");
      
      await expect(
        adPool.connect(otherAccount).withdraw(amount)
      ).to.be.revertedWith("AdPool: only owner");
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      await expect(adPool.transferOwnership(recipient.address))
        .to.emit(adPool, "OwnershipTransferred")
        .withArgs(owner.address, recipient.address);

      expect(await adPool.owner()).to.equal(recipient.address);
    });

    it("Should reject ownership transfer from non-owner", async function () {
      await expect(
        adPool.connect(otherAccount).transferOwnership(recipient.address)
      ).to.be.revertedWith("AdPool: only owner");
    });

    it("Should reject transfer to zero address", async function () {
      await expect(
        adPool.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("AdPool: invalid new owner");
    });
  });
});

