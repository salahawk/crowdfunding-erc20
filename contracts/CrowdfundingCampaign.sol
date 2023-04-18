// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CrowdfundingCampaign {
    struct Project {
        address owner; // project owner
        uint256 goal; // goal of the project
        uint256 deadline; // deadline of the campaign
        uint256 totalFunds; // total amount of pledged funds
        bool isFunded; // whether funded or not
        mapping(address => uint256) pledges; // mapping of pledges
    }

    IERC20 public crowdfundToken; // interface to crowdfund token
    uint256 public projectCounter; // counter of the project
    mapping(uint256 => Project) public projects; // list of projects

    event ProjectCreated(
        uint256 projectId,
        address owner,
        uint256 goal,
        uint256 deadline
    );
    event ProjectFunded(uint256 projectId, address funder, uint256 amount);
    event ProjectGoalReached(uint256 projectId);
    event FundsRefunded(uint256 projectId, address funder, uint256 amount);
    event FundWithdrawn(uint256 projectId, uint256 amount);

    constructor(address tokenAddress) {
        crowdfundToken = IERC20(tokenAddress);
    }

    modifier onlyProjectOwner(uint256 projectId) {
        require(projects[projectId].owner == msg.sender, "Not project owner");
        _;
    }

    function createProject(uint256 goal, uint256 duration) external {
        require(goal > 0, "goal must be positive");
        require(duration > 0, "duration must be positive");

        projectCounter++;

        Project storage newProject = projects[projectCounter];
        newProject.deadline = block.timestamp + duration;
        newProject.goal = goal;
        newProject.isFunded = false;
        newProject.owner = msg.sender;
        newProject.totalFunds = 0;

        emit ProjectCreated(projectCounter, msg.sender, goal, duration);
    }

    function fundProject(uint256 projectId, uint256 amount) external {
        require(
            projectId > 0 && projectId <= projectCounter,
            "Invalid project ID"
        );

        Project storage project = projects[projectId];
        require(
            block.timestamp < project.deadline,
            "Project funding has ended"
        );
        require(!project.isFunded, "Project already reached its goal");
        require(
            crowdfundToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed (may not have approved this transaction)"
        );

        project.totalFunds += amount;
        project.pledges[msg.sender] += amount;
        emit ProjectFunded(projectId, msg.sender, amount);

        if (project.totalFunds >= project.goal) {
            project.isFunded = true;
            emit ProjectGoalReached(projectId);
        }
    }

    function withdrawFunds(
        uint256 projectId
    ) external onlyProjectOwner(projectId) {
        Project storage project = projects[projectId];
        require(project.isFunded, "Project funding goal not reached");
        require(
            block.timestamp >= project.deadline,
            "Project funding is still ongoing"
        );

        uint256 amount = project.totalFunds;
        project.totalFunds = 0;
        require(
            crowdfundToken.transfer(project.owner, amount),
            "Token transfer failed"
        );
        emit FundWithdrawn(projectId, amount);
    }

    function refundPledge(uint256 projectId) external {
        require(
            projectId > 0 && projectId <= projectCounter,
            "Invalid project ID"
        );

        Project storage project = projects[projectId];
        require(
            block.timestamp >= project.deadline,
            "Project funding is still ongoing"
        );
        require(!project.isFunded, "Project reached its goal, cannot refund");

        uint256 amount = project.pledges[msg.sender];
        require(amount > 0, "No funds to refund for this user");

        project.pledges[msg.sender] = 0;
        project.totalFunds -= amount;

        require(
            crowdfundToken.transfer(msg.sender, amount),
            "Token transfer failed"
        );
        emit FundsRefunded(projectId, msg.sender, amount);
    }
}
