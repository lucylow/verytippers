// test/TipRouterFair.test.ts - Fairness Test Suite
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { TipRouterFair } from "../typechain-types";
import { Contract } from "ethers";

describe("TipRouterFair", function () {
  let tipRouter: TipRouterFair;
  let token: Contract;
  let relayer: SignerWithAddress;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let recipient: SignerWithAddress;
  let otherSigner: SignerWithAddress;

  beforeEach(async function () {
    [owner, relayer, user, recipient, otherSigner] = await ethers.getSigners();

    // Deploy mock ERC20 token
    try {
      const TokenFactory = await ethers.getContractFactory("MockERC20");
      token = await TokenFactory.deploy();
      await token.waitForDeployment();
    } catch (e) {
      // If MockERC20 doesn't exist, skip token-dependent tests
      console.warn("MockERC20 not found, some tests may be skipped");
      token = null;
    }

    // Deploy TipRouterFair
    const TipRouterFactory = await ethers.getContractFactory("TipRouterFair");
    if (token) {
      tipRouter = await TipRouterFactory.deploy(relayer.address, await token.getAddress());
    } else {
      // Use zero address as placeholder (tests will be limited)
      tipRouter = await TipRouterFactory.deploy(relayer.address, ethers.ZeroAddress);
    }
    await tipRouter.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct relayer signer and token", async function () {
      expect(await tipRouter.relayerSigner()).to.equal(relayer.address);
      if (token) {
        expect(await tipRouter.token()).to.equal(await token.getAddress());
      }
    });

    it("Should have default fairness parameters", async function () {
      expect(await tipRouter.minIntervalSec()).to.equal(30);
      expect(await tipRouter.maxTipAmount()).to.equal(ethers.parseEther("10"));
      expect(await tipRouter.baseDailyCap()).to.equal(ethers.parseEther("50"));
      expect(await tipRouter.stakeMultiplier()).to.equal(1);
      expect(await tipRouter.unstakeDelay()).to.equal(86400); // 1 day
    });
  });

  describe("submitTip - Fairness Controls", function () {
    const amount = ethers.parseEther("1.0");
    const ipfsCid = "QmTestHash1234567890";
    const cidHash = ethers.keccak256(ethers.toUtf8Bytes(ipfsCid));
    const nonce = 1;

    async function createSignature(
      signer: SignerWithAddress,
      from: string,
      to: string,
      amount: bigint,
      cidHash: string,
      nonce: bigint
    ) {
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "address", "uint256", "bytes32", "uint256"],
          [from, to, amount, cidHash, nonce]
        )
      );
      const messageBytes = ethers.getBytes(messageHash);
      const signature = await signer.signMessage(messageBytes);
      const sig = ethers.Signature.from(signature);
      return { v: sig.v, r: sig.r, s: sig.s, messageHash };
    }

    it("Should process valid tip with fairness checks", async function () {
      const { v, r, s } = await createSignature(
        relayer,
        user.address,
        recipient.address,
        amount,
        cidHash,
        BigInt(nonce)
      );

      await expect(
        tipRouter.connect(relayer).submitTip(
          user.address,
          recipient.address,
          amount,
          cidHash,
          nonce,
          v,
          r,
          s
        )
      )
        .to.emit(tipRouter, "TipSubmitted");

      const [, , totalTips] = await tipRouter.contractInfo();
      expect(totalTips).to.equal(1);
    });

    it("Should block tips above per-tx cap", async function () {
      const largeAmount = ethers.parseEther("11"); // > 10 VERY cap
      const { v, r, s } = await createSignature(
        relayer,
        user.address,
        recipient.address,
        largeAmount,
        cidHash,
        BigInt(nonce)
      );

      await expect(
        tipRouter.connect(relayer).submitTip(
          user.address,
          recipient.address,
          largeAmount,
          cidHash,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWithCustomError(tipRouter, "AmountExceedsCap");
    });

    it("Should block tips above daily cap", async function () {
      // Set a small daily cap for testing
      await tipRouter.connect(owner).setCaps(1, ethers.parseEther("10"), ethers.parseEther("20"), 0);
      
      const day = await tipRouter.currentDay();
      const firstTip = ethers.parseEther("15");
      const secondTip = ethers.parseEther("10"); // This would exceed 20 VERY daily cap

      // First tip should succeed
      const sig1 = await createSignature(
        relayer,
        user.address,
        recipient.address,
        firstTip,
        cidHash,
        BigInt(1)
      );
      await tipRouter.connect(relayer).submitTip(
        user.address,
        recipient.address,
        firstTip,
        cidHash,
        1,
        sig1.v,
        sig1.r,
        sig1.s
      );

      // Second tip should fail (exceeds daily cap)
      const sig2 = await createSignature(
        relayer,
        user.address,
        recipient.address,
        secondTip,
        cidHash,
        BigInt(2)
      );
      await expect(
        tipRouter.connect(relayer).submitTip(
          user.address,
          recipient.address,
          secondTip,
          cidHash,
          2,
          sig2.v,
          sig2.r,
          sig2.s
        )
      ).to.be.revertedWithCustomError(tipRouter, "DailyCapExceeded");
    });

    it("Should block tips within minimum interval", async function () {
      await tipRouter.connect(owner).setCaps(60, ethers.parseEther("10"), ethers.parseEther("50"), 0); // 60 sec interval

      const sig1 = await createSignature(
        relayer,
        user.address,
        recipient.address,
        amount,
        cidHash,
        BigInt(1)
      );
      await tipRouter.connect(relayer).submitTip(
        user.address,
        recipient.address,
        amount,
        cidHash,
        1,
        sig1.v,
        sig1.r,
        sig1.s
      );

      // Try to tip again immediately (should fail)
      const sig2 = await createSignature(
        relayer,
        user.address,
        recipient.address,
        amount,
        cidHash,
        BigInt(2)
      );
      await expect(
        tipRouter.connect(relayer).submitTip(
          user.address,
          recipient.address,
          amount,
          cidHash,
          2,
          sig2.v,
          sig2.r,
          sig2.s
        )
      ).to.be.revertedWithCustomError(tipRouter, "RateLimited");
    });

    it("Should block self-tips", async function () {
      const { v, r, s } = await createSignature(
        relayer,
        user.address,
        user.address, // Same address
        amount,
        cidHash,
        BigInt(nonce)
      );

      await expect(
        tipRouter.connect(relayer).submitTip(
          user.address,
          user.address,
          amount,
          cidHash,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWithCustomError(tipRouter, "SelfTip");
    });

    it("Should block tips from blacklisted addresses", async function () {
      await tipRouter.connect(owner).setBlacklist(user.address, true);

      const { v, r, s } = await createSignature(
        relayer,
        user.address,
        recipient.address,
        amount,
        cidHash,
        BigInt(nonce)
      );

      await expect(
        tipRouter.connect(relayer).submitTip(
          user.address,
          recipient.address,
          amount,
          cidHash,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWithCustomError(tipRouter, "Blacklisted");
    });

    it("Should block tips to blacklisted addresses", async function () {
      await tipRouter.connect(owner).setBlacklist(recipient.address, true);

      const { v, r, s } = await createSignature(
        relayer,
        user.address,
        recipient.address,
        amount,
        cidHash,
        BigInt(nonce)
      );

      await expect(
        tipRouter.connect(relayer).submitTip(
          user.address,
          recipient.address,
          amount,
          cidHash,
          nonce,
          v,
          r,
          s
        )
      ).to.be.revertedWithCustomError(tipRouter, "Blacklisted");
    });
  });

  describe("Staking", function () {
    beforeEach(async function () {
      if (!token) {
        this.skip(); // Skip staking tests if no token
      }
      // Mint tokens to user for staking
      await token.mint(user.address, ethers.parseEther("100"));
      await token.connect(user).approve(await tipRouter.getAddress(), ethers.parseEther("100"));
    });

    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.parseEther("10");
      await expect(
        tipRouter.connect(user).stake(stakeAmount)
      )
        .to.emit(tipRouter, "Staked")
        .withArgs(user.address, stakeAmount);

      expect(await tipRouter.stakeBalance(user.address)).to.equal(stakeAmount);
    });

    it("Should increase daily cap based on staked amount", async function () {
      const stakeAmount = ethers.parseEther("20");
      await tipRouter.connect(user).stake(stakeAmount);

      const baseCap = await tipRouter.baseDailyCap();
      const multiplier = await tipRouter.stakeMultiplier();
      const expectedCap = baseCap + (stakeAmount * multiplier);
      const effectiveCap = await tipRouter.effectiveDailyCap(user.address);

      expect(effectiveCap).to.equal(expectedCap);
    });

    it("Should allow unstaking with delay", async function () {
      const stakeAmount = ethers.parseEther("10");
      await tipRouter.connect(user).stake(stakeAmount);

      await expect(
        tipRouter.connect(user).initiateUnstake(stakeAmount)
      )
        .to.emit(tipRouter, "UnstakeInitiated");

      expect(await tipRouter.stakeBalance(user.address)).to.equal(0);
      expect(await tipRouter.unstakedAmount(user.address)).to.equal(stakeAmount);
    });

    it("Should prevent immediate withdrawal after unstake", async function () {
      const stakeAmount = ethers.parseEther("10");
      await tipRouter.connect(user).stake(stakeAmount);
      await tipRouter.connect(user).initiateUnstake(stakeAmount);

      await expect(
        tipRouter.connect(user).withdrawUnstaked(stakeAmount)
      ).to.be.revertedWithCustomError(tipRouter, "UnstakeNotReady");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update relayer signer", async function () {
      await expect(
        tipRouter.connect(owner).setRelayerSigner(otherSigner.address)
      )
        .to.emit(tipRouter, "RelayerSignerUpdated")
        .withArgs(relayer.address, otherSigner.address);

      expect(await tipRouter.relayerSigner()).to.equal(otherSigner.address);
    });

    it("Should allow owner to update caps", async function () {
      await tipRouter.connect(owner).setCaps(
        60,                    // minInterval
        ethers.parseEther("20"), // maxTipAmount
        ethers.parseEther("100"), // baseDailyCap
        2                      // stakeMultiplier
      );

      expect(await tipRouter.minIntervalSec()).to.equal(60);
      expect(await tipRouter.maxTipAmount()).to.equal(ethers.parseEther("20"));
      expect(await tipRouter.baseDailyCap()).to.equal(ethers.parseEther("100"));
      expect(await tipRouter.stakeMultiplier()).to.equal(2);
    });

    it("Should allow owner to update blacklist", async function () {
      await expect(
        tipRouter.connect(owner).setBlacklist(user.address, true)
      )
        .to.emit(tipRouter, "BlacklistUpdated")
        .withArgs(user.address, true);

      expect(await tipRouter.blacklist(user.address)).to.be.true;

      await tipRouter.connect(owner).setBlacklist(user.address, false);
      expect(await tipRouter.blacklist(user.address)).to.be.false;
    });

    it("Should prevent non-owner from updating parameters", async function () {
      await expect(
        tipRouter.connect(user).setCaps(1, ethers.parseEther("10"), ethers.parseEther("50"), 0)
      ).to.be.revertedWithCustomError(tipRouter, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    it("Should return correct message hash", async function () {
      const from = user.address;
      const to = recipient.address;
      const amount = ethers.parseEther("1.0");
      const cidHash = ethers.keccak256(ethers.toUtf8Bytes("QmTest"));
      const nonce = 1;

      const contractHash = await tipRouter.getMessageHash(
        from,
        to,
        amount,
        cidHash,
        nonce
      );

      const expectedHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "address", "uint256", "bytes32", "uint256"],
          [from, to, amount, cidHash, nonce]
        )
      );

      expect(contractHash).to.equal(expectedHash);
    });

    it("Should return current day index", async function () {
      const day = await tipRouter.currentDay();
      const expectedDay = Math.floor(Date.now() / 1000 / 86400);
      // Allow some tolerance for test execution time
      expect(Number(day)).to.be.closeTo(expectedDay, 1);
    });
  });
});

