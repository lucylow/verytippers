// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./VeryToken.sol";

/**
 * @title VeryRewards - On-Chain Reward Distribution Contract
 * @dev Validates signed reward payloads and mints $VERY tokens
 * Uses EIP-191 signature verification with replay protection
 * Designed for gasless UX via relayer
 */
contract VeryRewards is Ownable {
    using ECDSA for bytes32;

    /// @notice VeryToken contract instance
    VeryToken public immutable veryToken;

    /// @notice Authorized off-chain signer (KMS / HSM)
    address public rewardSigner;

    /// @notice Replay protection: reward hash → used status
    mapping(bytes32 => bool) public rewardUsed;

    /// @notice Total rewards granted
    uint256 public totalRewardsGranted;

    /// @notice Contract version
    uint256 public constant VERSION = 1;

    // ========== EVENTS ==========

    /**
     * @dev Emitted when a reward is successfully granted
     * @param user Address receiving the reward
     * @param amount Amount of $VERY tokens awarded
     * @param reason Reason for the reward (e.g., "TIP_SENT", "REFERRAL")
     * @param rewardHash Unique hash for this reward (replay protection)
     */
    event RewardGranted(
        address indexed user,
        uint256 amount,
        string reason,
        bytes32 indexed rewardHash
    );

    /**
     * @dev Emitted when reward signer is updated
     * @param oldSigner Previous signer address
     * @param newSigner New signer address
     */
    event RewardSignerUpdated(address indexed oldSigner, address indexed newSigner);

    // ========== ERRORS ==========

    error InvalidSigner();
    error RewardAlreadyClaimed();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidSignature();

    // ========== CONSTRUCTOR ==========

    /**
     * @dev Deploy VeryRewards contract
     * @param _token Address of VeryToken contract
     * @param _signer Address of authorized reward signer (KMS-derived address)
     */
    constructor(address _token, address _signer) Ownable(msg.sender) {
        require(_token != address(0), "VeryRewards: token cannot be zero address");
        require(_signer != address(0), "VeryRewards: signer cannot be zero address");
        
        veryToken = VeryToken(_token);
        rewardSigner = _signer;
    }

    // ========== CORE FUNCTIONALITY ==========

    /**
     * @notice Grant reward to user based on signed payload
     * @dev Validates signature, checks replay protection, mints tokens
     * @param user Address receiving the reward
     * @param amount Amount of $VERY tokens to award (in wei, 18 decimals)
     * @param reason Reason for reward (e.g., "TIP_SENT", "REFERRAL", "QUALITY_CONTENT")
     * @param nonce Unique nonce for this reward (timestamp recommended)
     * @param v Signature v component
     * @param r Signature r component
     * @param s Signature s component
     */
    function grantReward(
        address user,
        uint256 amount,
        string calldata reason,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Validate inputs
        if (user == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        // Compute reward hash (must match off-chain signing)
        bytes32 rewardHash = keccak256(
            abi.encodePacked(user, amount, reason, nonce, address(this))
        );

        // Check replay protection
        if (rewardUsed[rewardHash]) revert RewardAlreadyClaimed();

        // Verify signature (EIP-191)
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", rewardHash)
        );
        
        address signer = ethSignedHash.recover(v, r, s);
        if (signer != rewardSigner) revert InvalidSigner();

        // Mark as used
        rewardUsed[rewardHash] = true;

        // Mint tokens to user
        veryToken.mint(user, amount);

        // Update stats
        unchecked {
            ++totalRewardsGranted;
        }

        // Emit event for indexer
        emit RewardGranted(user, amount, reason, rewardHash);
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Update reward signer address (owner only)
     * @dev Use multisig for production
     * @param newSigner New KMS-derived signer address
     */
    function setRewardSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidAddress();
        
        address oldSigner = rewardSigner;
        rewardSigner = newSigner;
        
        emit RewardSignerUpdated(oldSigner, newSigner);
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Check if a reward hash has been claimed
     * @param rewardHash Hash to check
     * @return isUsed True if reward already claimed
     */
    function isRewardUsed(bytes32 rewardHash) external view returns (bool isUsed) {
        return rewardUsed[rewardHash];
    }

    /**
     * @notice Get reward hash for signature verification
     * @param user Recipient address
     * @param amount Reward amount
     * @param reason Reward reason
     * @param nonce Unique nonce
     * @return rewardHash Hash to sign off-chain
     */
    function getRewardHash(
        address user,
        uint256 amount,
        string calldata reason,
        uint256 nonce
    ) external view returns (bytes32 rewardHash) {
        return keccak256(
            abi.encodePacked(user, amount, reason, nonce, address(this))
        );
    }

    /**
     * @notice Get contract information
     * @return version Contract version
     * @return token VeryToken address
     * @return signer Current reward signer
     * @return totalRewards Total rewards granted
     */
    function contractInfo() external view returns (
        uint256 version,
        address token,
        address signer,
        uint256 totalRewards
    ) {
        return (VERSION, address(veryToken), rewardSigner, totalRewardsGranted);
    }
}

