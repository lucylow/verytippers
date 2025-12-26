// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VeryRewardsPool - Daily Rewards Distribution System
 * @dev Non-inflationary rewards pool for top creators
 * 
 * Features:
 * - Predictable daily emissions
 * - Transparent reward distribution
 * - DAO-controlled parameters
 */
contract VeryRewardsPool is Ownable {
    using SafeERC20 for IERC20;
    
    /// @notice VERY token contract
    IERC20 public immutable VERY;
    
    /// @notice Daily rewards pool amount (default: 10,000 VERY)
    uint256 public dailyPool;
    
    /// @notice Last distribution day
    mapping(uint256 => bool) public distributed;
    
    /// @notice Emitted when rewards are distributed
    event RewardsDistributed(
        uint256 indexed day,
        address[] recipients,
        uint256 totalAmount
    );
    
    /// @notice Emitted when daily pool is updated
    event DailyPoolUpdated(uint256 oldAmount, uint256 newAmount);
    
    error AlreadyDistributed();
    error InvalidRecipients();
    error InsufficientBalance();
    error ZeroAmount();
    
    /**
     * @dev Constructor
     * @param veryToken VERY token address
     * @param _dailyPool Daily pool amount (default: 10,000 VERY)
     */
    constructor(address veryToken, uint256 _dailyPool) Ownable(msg.sender) {
        if (veryToken == address(0)) revert InvalidRecipients();
        VERY = IERC20(veryToken);
        dailyPool = _dailyPool;
    }
    
    /**
     * @notice Distribute daily rewards to top creators
     * @dev Can only be called once per day
     * @param topCreators Array of top creator addresses
     */
    function distribute(address[] calldata topCreators) external onlyOwner {
        if (topCreators.length == 0) revert InvalidRecipients();
        
        uint256 day = block.timestamp / 1 days;
        if (distributed[day]) revert AlreadyDistributed();
        
        distributed[day] = true;
        
        uint256 share = dailyPool / topCreators.length;
        if (share == 0) revert ZeroAmount();
        
        // Check contract balance
        uint256 balance = VERY.balanceOf(address(this));
        if (balance < dailyPool) revert InsufficientBalance();
        
        // Distribute to each creator
        for (uint256 i = 0; i < topCreators.length; i++) {
            if (topCreators[i] != address(0)) {
                VERY.safeTransfer(topCreators[i], share);
            }
        }
        
        emit RewardsDistributed(day, topCreators, dailyPool);
    }
    
    /**
     * @notice Update daily pool amount (owner only)
     * @param newDailyPool New daily pool amount
     */
    function setDailyPool(uint256 newDailyPool) external onlyOwner {
        uint256 oldPool = dailyPool;
        dailyPool = newDailyPool;
        emit DailyPoolUpdated(oldPool, newDailyPool);
    }
    
    /**
     * @notice Get current day index
     * @return day Current day index
     */
    function currentDay() external view returns (uint256) {
        return block.timestamp / 1 days;
    }
    
    /**
     * @notice Check if rewards have been distributed for today
     * @return distributedToday True if already distributed
     */
    function isDistributedToday() external view returns (bool) {
        uint256 day = block.timestamp / 1 days;
        return distributed[day];
    }
}

