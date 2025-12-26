// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VeryToken - $VERY Utility Token for VeryTippers Ecosystem
 * @dev Gas-optimized ERC20 token with max supply cap and treasury-controlled minting
 * 
 * $VERY is not just a currency. It is:
 * - Medium of appreciation (tips)
 * - Reputation signal (leaderboards, boosts)
 * - Governance weight (DAO + proposals)
 * - Gamification fuel (badges, multipliers)
 * - Anti-spam mechanism (rate limits, staking)
 * - Programmable incentive layer (AI + rules)
 */
contract VeryToken is ERC20, Ownable {
    /// @notice Maximum supply cap: 1 billion VERY tokens
    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether;

    /**
     * @dev Constructor mints initial treasury allocation
     * @param treasury Address to receive initial 100M VERY tokens
     */
    constructor(address treasury) ERC20("Very Token", "VERY") Ownable(msg.sender) {
        require(treasury != address(0), "VeryToken: treasury cannot be zero address");
        // Initial treasury: 100M VERY (10% of max supply)
        _mint(treasury, 100_000_000 ether);
    }

    /**
     * @notice Mint tokens to an address (owner only)
     * @dev Enforces MAX_SUPPLY cap
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "VeryToken: cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "VeryToken: MAX_SUPPLY exceeded");
        _mint(to, amount);
    }
}

