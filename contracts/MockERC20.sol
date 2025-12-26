// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20 - Mock ERC20 token for testing
 * @dev Simple ERC20 implementation for testing TipRouterFair
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**18);
    }

    /**
     * @notice Mint tokens to an address (for testing)
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

