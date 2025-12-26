// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VeryStake - Anti-Spam Staking System
 * @dev Users must stake VERY to unlock tipping capacity
 * 
 * Features:
 * - Minimum stake requirement for tipping
 * - Economic friction to prevent sybil attacks
 * - DAO-tunable parameters
 */
contract VeryStake is Ownable {
    using SafeERC20 for IERC20;
    
    /// @notice VERY token contract
    IERC20 public immutable VERY;
    
    /// @notice Minimum stake required to tip (default: 100 VERY)
    uint256 public minStakeRequired;
    
    /// @notice Staked balance per user
    mapping(address => uint256) public staked;
    
    /// @notice Last tip block per user (for rate limiting)
    mapping(address => uint256) public lastTipBlock;
    
    /// @notice Emitted when user stakes tokens
    event Staked(address indexed user, uint256 amount);
    
    /// @notice Emitted when user unstakes tokens
    event Unstaked(address indexed user, uint256 amount);
    
    /// @notice Emitted when minimum stake is updated
    event MinStakeUpdated(uint256 oldAmount, uint256 newAmount);
    
    error InsufficientStake();
    error ZeroAmount();
    error InvalidAddress();
    
    /**
     * @dev Constructor
     * @param veryToken VERY token address
     * @param _minStakeRequired Minimum stake required (default: 100 VERY)
     */
    constructor(address veryToken, uint256 _minStakeRequired) Ownable(msg.sender) {
        if (veryToken == address(0)) revert InvalidAddress();
        VERY = IERC20(veryToken);
        minStakeRequired = _minStakeRequired;
    }
    
    /**
     * @notice Stake VERY tokens
     * @param amount Amount to stake
     */
    function stake(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        
        VERY.safeTransferFrom(msg.sender, address(this), amount);
        staked[msg.sender] += amount;
        
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @notice Unstake VERY tokens
     * @param amount Amount to unstake
     */
    function unstake(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (staked[msg.sender] < amount) revert InsufficientStake();
        
        staked[msg.sender] -= amount;
        VERY.safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @notice Check if user can tip (has sufficient stake)
     * @param user User address
     * @return canTip True if user can tip
     */
    function canTip(address user) external view returns (bool) {
        return staked[user] >= minStakeRequired;
    }
    
    /**
     * @notice Get stake info for a user
     * @param user User address
     * @return stakedAmount Current staked amount
     * @return canTipUser Whether user can tip
     */
    function getStakeInfo(address user) external view returns (
        uint256 stakedAmount,
        bool canTipUser
    ) {
        stakedAmount = staked[user];
        canTipUser = stakedAmount >= minStakeRequired;
    }
    
    /**
     * @notice Update minimum stake required (owner only)
     * @param newMinStake New minimum stake amount
     */
    function setMinStakeRequired(uint256 newMinStake) external onlyOwner {
        uint256 oldMinStake = minStakeRequired;
        minStakeRequired = newMinStake;
        emit MinStakeUpdated(oldMinStake, newMinStake);
    }
    
    /**
     * @notice Record tip block (called by TipRouter)
     * @param user User address
     */
    function recordTipBlock(address user) external {
        // Only authorized contracts can call this
        // In production, add access control
        lastTipBlock[user] = block.number;
    }
}

