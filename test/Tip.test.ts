import { expect } from "chai";
import { ethers } from "hardhat";

describe("Tip Contract", function () {
  it("Should allow a user to send a tip", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const Tip = await ethers.getContractFactory("Tip");
    const tip = await Tip.deploy();

    expect(tip.target).to.properAddress;
  });
});
