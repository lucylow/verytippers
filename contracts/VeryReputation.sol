// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VeryReputation - On-Chain Reputation & Gamification System
 * @dev Tracks lifetime tips sent/received and calculates multipliers
 * 
 * Features:
 * - Lifetime tipping stats (sent/received)
 * - Tip multipliers based on reputation
 * - Leaderboard data source
 * - AI-aware reputation signals
 */
contract VeryReputation is Ownable {
    /// @notice Lifetime tips sent per user
    mapping(address => uint256) public lifetimeTipped;
    
    /// @notice Lifetime tips received per user
    mapping(address => uint256) public lifetimeReceived;
    
    /// @notice Authorized contracts that can record tips
    mapping(address => bool) public authorizedRecorders;
    
    /// @notice Emitted when reputation is updated
    event ReputationUpdated(
        address indexed user,
        uint256 tipped,
        uint256 received
    );
    
    /// @notice Emitted when recorder authorization changes
    event RecorderUpdated(address indexed recorder, bool authorized);
    
    error UnauthorizedRecorder();
    error InvalidAddresses();
    
    modifier onlyRecorder() {
        if (!authorizedRecorders[msg.sender]) revert UnauthorizedRecorder();
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Authorize a contract to record tips (e.g., TipRouter)
     * @param recorder Contract address
     * @param authorized True to authorize, false to revoke
     */
    function setRecorder(address recorder, bool authorized) external onlyOwner {
        if (recorder == address(0)) revert InvalidAddresses();
        authorizedRecorders[recorder] = authorized;
        emit RecorderUpdated(recorder, authorized);
    }
    
    /**
     * @notice Record a tip (called by TipRouter)
     * @param from Tipper address
     * @param to Recipient address
     * @param amount Tip amount in wei
     */
    function recordTip(
        address from,
        address to,
        uint256 amount
    ) external onlyRecorder {
        if (from == address(0) || to == address(0)) revert InvalidAddresses();
        
        lifetimeTipped[from] += amount;
        lifetimeReceived[to] += amount;
        
        emit ReputationUpdated(from, lifetimeTipped[from], lifetimeReceived[from]);
        emit ReputationUpdated(to, lifetimeTipped[to], lifetimeReceived[to]);
    }
    
    /**
     * @notice Get tip multiplier for a user based on reputation
     * @dev Returns basis points (100 = 1x, 120 = 1.2x, 150 = 1.5x)
     * @param user User address
     * @return multiplier Multiplier in basis points
     */
    function tipMultiplier(address user) external view returns (uint256) {
        uint256 received = lifetimeReceived[user];
        
        // Legendary: 10,000+ VERY received = 1.5x multiplier
        if (received >= 10_000 ether) return 150;
        
        // Epic: 1,000+ VERY received = 1.2x multiplier
        if (received >= 1_000 ether) return 120;
        
        // Base: 1x multiplier
        return 100;
    }
    
    /**
     * @notice Get reputation stats for a user
     * @param user User address
     * @return tipped Lifetime tips sent
     * @return received Lifetime tips received
     * @return multiplier Current tip multiplier (basis points)
     */
    function getReputation(address user) external view returns (
        uint256 tipped,
        uint256 received,
        uint256 multiplier
    ) {
        tipped = lifetimeTipped[user];
        received = lifetimeReceived[user];
        multiplier = this.tipMultiplier(user);
    }
}

