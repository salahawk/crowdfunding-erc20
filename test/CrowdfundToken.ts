import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory, Contract } from "ethers";

describe("CrowdfundToken", function () {
  let Token: ContractFactory;
  let token: Contract;
  let owner: SignerWithAddress;
  let funder1: SignerWithAddress;
  let funder2: SignerWithAddress;
  const TOTAL_SUPPLY = 10000000000000;

  beforeEach(async () => {
    [owner, funder1, funder2] = await ethers.getSigners();
    Token = await ethers.getContractFactory("CrowdfundToken");
    token = await Token.deploy(TOTAL_SUPPLY);
    await token.deployed();
  });

  it("Deployer should hold all tokens", async () => {
    const deployerBalance = await token.balanceOf(owner.address);
    const userBalance = await token.balanceOf(funder1.address);
    expect(deployerBalance).to.equal(TOTAL_SUPPLY);
    expect(userBalance).to.equal(0);
  });
  it("Token Transfer should work fine", async () => {
    const prevDeployerBalance = await token.balanceOf(owner.address);
    const prevUserBalance = await token.balanceOf(funder1.address);
    await expect(
      token.transfer(funder1.address, ethers.utils.parseUnits("100", 8))
    ).to.emit(token, "Transfer");
    const afterDeployerBalance = await token.balanceOf(owner.address);
    const afterUserBalance = await token.balanceOf(funder1.address);

    expect(prevDeployerBalance - afterDeployerBalance).to.equal(
      ethers.utils.parseUnits("100", 8)
    );
    expect(afterUserBalance - prevUserBalance).to.equal(
      ethers.utils.parseUnits("100", 8)
    );
  });
});
