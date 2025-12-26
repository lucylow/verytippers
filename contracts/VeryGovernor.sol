// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./VeryToken.sol";
import "./VeryReputation.sol";

/**
 * @title VeryGovernor - Token-Weighted Governance System
 * @dev Calculates voting power based on token balance, reputation, and NFTs
 * 
 * Voting Power Formula:
 * VotingPower = VERY_balance + (lifetime_received * 100) + NFT_multiplier
 * 
 * This rewards contribution (tips received) over pure whale dominance.
 */
contract VeryGovernor is Ownable {
    VeryToken public immutable very;
    VeryReputation public immutable reputation;
    
    /// @notice NFT contract address (optional boost)
    address public nftContract;
    
    /// @notice NFT multiplier per NFT owned (default: 1000)
    uint256 public nftMultiplier;
    
    /// @notice Reputation weight multiplier (default: 100)
    /// 1 VERY received in tips = 100 voting power
    uint256 public reputationWeight;
    
    /// @notice Emitted when voting power is calculated
    event VotingPowerCalculated(
        address indexed user,
        uint256 tokenBalance,
        uint256 reputationPower,
        uint256 nftPower,
        uint256 totalPower
    );
    
    error InvalidAddress();
    
    /**
     * @dev Constructor
     * @param _very VERY token address
     * @param _reputation VeryReputation contract address
     */
    constructor(address _very, address _reputation) Ownable(msg.sender) {
        if (_very == address(0) || _reputation == address(0)) revert InvalidAddress();
        very = VeryToken(_very);
        reputation = VeryReputation(_reputation);
        reputationWeight = 100; // 1 VERY received = 100 voting power
        nftMultiplier = 1000; // Each NFT = 1000 voting power
    }
    
    /**
     * @notice Set NFT contract address (optional)
     * @param _nftContract NFT contract address
     */
    function setNFTContract(address _nftContract) external onlyOwner {
        nftContract = _nftContract;
    }
    
    /**
     * @notice Set reputation weight multiplier
     * @param _weight New weight (default: 100)
     */
    function setReputationWeight(uint256 _weight) external onlyOwner {
        reputationWeight = _weight;
    }
    
    /**
     * @notice Set NFT multiplier
     * @param _multiplier New multiplier (default: 1000)
     */
    function setNFTMultiplier(uint256 _multiplier) external onlyOwner {
        nftMultiplier = _multiplier;
    }
    
    /**
     * @notice Calculate voting power for a user
     * @param user User address
     * @return power Total voting power
     */
    function votingPower(address user) external view returns (uint256) {
        // Token balance power
        uint256 tokenBalance = very.balanceOf(user);
        
        // Reputation power (lifetime received * weight)
        uint256 received = reputation.lifetimeReceived(user);
        uint256 reputationPower = received * reputationWeight / 1 ether;
        
        // NFT power (if NFT contract is set)
        uint256 nftPower = 0;
        if (nftContract != address(0)) {
            // Simple implementation: assume 1 NFT = multiplier
            // In production, query actual NFT balance
            // For now, return 0 (can be extended)
            // nftPower = IERC721(nftContract).balanceOf(user) * nftMultiplier;
        }
        
        uint256 totalPower = tokenBalance + reputationPower + nftPower;
        
        return totalPower;
    }
    
    /**
     * @notice Get detailed voting power breakdown
     * @param user User address
     * @return tokenPower Voting power from token balance
     * @return repPower Voting power from reputation
     * @return nftPower Voting power from NFTs
     * @return totalPower Total voting power
     */
    function getVotingPowerBreakdown(address user) external view returns (
        uint256 tokenPower,
        uint256 repPower,
        uint256 nftPower,
        uint256 totalPower
    ) {
        tokenPower = very.balanceOf(user);
        
        uint256 received = reputation.lifetimeReceived(user);
        repPower = received * reputationWeight / 1 ether;
        
        nftPower = 0; // Can be extended with NFT balance
        
        totalPower = tokenPower + repPower + nftPower;
    }
}

