// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CrowdfundToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("CrowdfundToken", "CFT") {
        _mint(msg.sender, initialSupply);
    }
}
