import { ethers } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  console.log(`Deployer addresses: ${owner.address}`);
  console.log(
    `======================================================================`
  );

  const TOTAL_SUPPLY = 10000000000000;
  const Token = await ethers.getContractFactory("CrowdfundToken");
  const token = await Token.deploy(TOTAL_SUPPLY);
  await token.deployed();

  const CrowdfundingCampaign = await ethers.getContractFactory(
    "CrowdfundingCampaign"
  );
  const crowdfundingCampaign = await CrowdfundingCampaign.deploy(token.address);
  await crowdfundingCampaign.deployed();

  console.log(`Crowdfund Token deployed to ${token.address}`);
  console.log(
    `Crowdfunding Campaign Contract deployed to ${crowdfundingCampaign.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
