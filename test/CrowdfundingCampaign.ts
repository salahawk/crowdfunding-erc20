import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory, Contract } from "ethers";

describe("CrowdfundingCampaign", function () {
  let Token: ContractFactory;
  let CrowdfundingCampaign: ContractFactory;
  let token: Contract;
  let crowdfundingCampaign: Contract;
  let deployer: SignerWithAddress;
  let owner: SignerWithAddress;
  let funder1: SignerWithAddress;
  let funder2: SignerWithAddress;

  const TOTAL_SUPPLY = 10000000000000;
  const PROJECT_GOAL = 10000000000;
  const ONE_DAY_IN_SECS = 24 * 60 * 60;

  beforeEach(async () => {
    [deployer, owner, funder1, funder2] = await ethers.getSigners();
    Token = await ethers.getContractFactory("CrowdfundToken");
    token = await Token.deploy(TOTAL_SUPPLY);
    await token.deployed();

    CrowdfundingCampaign = await ethers.getContractFactory(
      "CrowdfundingCampaign"
    );
    crowdfundingCampaign = await CrowdfundingCampaign.deploy(token.address);
    await crowdfundingCampaign.deployed();
  });

  describe("Project management", async () => {
    it("Anyone should be able to create a campaign", async () => {
      // CAMPAIGN for one day
      await expect(
        crowdfundingCampaign
          .connect(owner)
          .createProject(PROJECT_GOAL, ONE_DAY_IN_SECS)
      )
        .to.emit(crowdfundingCampaign, "ProjectCreated")
        .withArgs(1, owner.address, PROJECT_GOAL, ONE_DAY_IN_SECS);
    });
    it("Only project owner should be able to withdraw fund when fully funded", async () => {
      const unlockTime = (await time.latest()) + ONE_DAY_IN_SECS;

      await token.transfer(funder1.address, PROJECT_GOAL);
      token
        .connect(funder1)
        .approve(crowdfundingCampaign.address, PROJECT_GOAL);

      await crowdfundingCampaign
        .connect(owner)
        .createProject(PROJECT_GOAL, ONE_DAY_IN_SECS);
      await crowdfundingCampaign.connect(funder1).fundProject(1, PROJECT_GOAL);

      await time.increaseTo(unlockTime);

      expect((await crowdfundingCampaign.projects(1)).isFunded).to.be.true;
      await expect(crowdfundingCampaign.withdrawFunds(1)).to.revertedWith(
        "Not project owner"
      );
    });
    it("Project owner should not be able to withdraw fund before campaign is over though it's fully funded", async () => {
      await token.transfer(funder1.address, PROJECT_GOAL);
      token
        .connect(funder1)
        .approve(crowdfundingCampaign.address, PROJECT_GOAL);

      await crowdfundingCampaign
        .connect(owner)
        .createProject(PROJECT_GOAL, ONE_DAY_IN_SECS);
      await crowdfundingCampaign.connect(funder1).fundProject(1, PROJECT_GOAL);

      expect((await crowdfundingCampaign.projects(1)).isFunded).to.be.true;
      await expect(
        crowdfundingCampaign.connect(owner).withdrawFunds(1)
      ).to.revertedWith("Project funding is still ongoing");
    });
    it("Project owner should be able to withdraw fund when campaign is over & it's fully funded", async () => {
      await token.transfer(funder1.address, PROJECT_GOAL);
      token
        .connect(funder1)
        .approve(crowdfundingCampaign.address, PROJECT_GOAL);

      await crowdfundingCampaign
        .connect(owner)
        .createProject(PROJECT_GOAL, ONE_DAY_IN_SECS);
      await crowdfundingCampaign.connect(funder1).fundProject(1, PROJECT_GOAL);

      const unlockTime = (await time.latest()) + ONE_DAY_IN_SECS;
      await time.increaseTo(unlockTime);

      expect((await crowdfundingCampaign.projects(1)).isFunded).to.be.true;
      await expect(crowdfundingCampaign.connect(owner).withdrawFunds(1))
        .to.emit(crowdfundingCampaign, "FundWithdrawn")
        .withArgs(1, PROJECT_GOAL);
    });
  });

  describe("Funding mechanisms", async () => {
    beforeEach(async () => {
      await crowdfundingCampaign
        .connect(owner)
        .createProject(PROJECT_GOAL, ONE_DAY_IN_SECS);
    });

    it("Users should not be able to fund when campaign over", async () => {
      const unlockTime = (await time.latest()) + ONE_DAY_IN_SECS;
      await time.increaseTo(unlockTime);
      await expect(
        crowdfundingCampaign.connect(funder1).fundProject(1, PROJECT_GOAL)
      ).to.revertedWith("Project funding has ended");
    });
    it("Project should be marked un-funded when insufficient fund is raised", async () => {
      expect((await crowdfundingCampaign.projects(1)).isFunded).to.be.false;
    });
    it("Project should be marked funded when fund is raised enough", async () => {
      await token.transfer(funder1.address, PROJECT_GOAL);
      token
        .connect(funder1)
        .approve(crowdfundingCampaign.address, PROJECT_GOAL);

      await expect(
        crowdfundingCampaign.connect(funder1).fundProject(1, PROJECT_GOAL)
      )
        .to.emit(crowdfundingCampaign, "ProjectGoalReached")
        .withArgs(1);
      const project = await crowdfundingCampaign.projects(1);
      expect(project.isFunded).to.be.true;
    });
    it("Users should not be able to refund when campaign's over & fully funded", async () => {
      const unlockTime = (await time.latest()) + ONE_DAY_IN_SECS;

      await token.transfer(funder1.address, PROJECT_GOAL);
      token
        .connect(funder1)
        .approve(crowdfundingCampaign.address, PROJECT_GOAL);

      await crowdfundingCampaign.connect(funder1).fundProject(1, PROJECT_GOAL);

      await time.increaseTo(unlockTime);

      expect((await crowdfundingCampaign.projects(1)).isFunded).to.be.true;
      await expect(
        crowdfundingCampaign.connect(funder1).refundPledge(1)
      ).to.revertedWith("Project reached its goal, cannot refund");
    });

    it("Users should be able to refund when campaign's over & not-funded", async () => {
      const unlockTime = (await time.latest()) + ONE_DAY_IN_SECS;

      await token.transfer(funder1.address, PROJECT_GOAL);
      token
        .connect(funder1)
        .approve(crowdfundingCampaign.address, PROJECT_GOAL);

      await crowdfundingCampaign
        .connect(funder1)
        .fundProject(1, PROJECT_GOAL / 2);

      await time.increaseTo(unlockTime);

      expect((await crowdfundingCampaign.projects(1)).isFunded).to.be.false;
      await expect(crowdfundingCampaign.connect(funder1).refundPledge(1))
        .to.changeTokenBalances(
          token,
          [crowdfundingCampaign.address, funder1.address],
          [-PROJECT_GOAL / 2, PROJECT_GOAL / 2]
        )
        .to.emit(crowdfundingCampaign, "FundsRefunded")
        .withArgs(1, funder1.address, PROJECT_GOAL / 2);
    });
  });
});
