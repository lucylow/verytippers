// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TipRouterFair - Fairness-enhanced gasless micro-tipping for VERY Chain
 * @dev Production-ready smart contract with fairness controls
 * Features:
 *   - Per-tx caps, per-day caps, minimum inter-tip intervals
 *   - Anti-self-tip and blacklist protection
 *   - Stake-based allowances for trusted users
 *   - Admin tunable parameters and on-chain audit events
 *   - Maintains meta-tx / relayer signature flow (ecrecover verification)
 * Chain: VERY Chain Mainnet (ID: 8888)
 */
contract TipRouterFair is ReentrancyGuard, Ownable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    // ========== STATE ==========
    
    /// @notice Relayer KMS signer address (AWS KMS, Vault, etc.)
    address public relayerSigner;
    
    /// @notice ERC20 token used for tips (VERY token)
    IERC20 public immutable token;
    
    /// @notice Minimum seconds between tips per sender
    uint256 public minIntervalSec;
    
    /// @notice Maximum tip amount per transaction
    uint256 public maxTipAmount;
    
    /// @notice Base daily cap per user (can be increased by staking)
    uint256 public baseDailyCap;
    
    /// @notice Stake multiplier: each token staked increases daily cap by this amount
    uint256 public stakeMultiplier;
    
    /// @notice Unstake delay to prevent flash manipulation
    uint256 public unstakeDelay;
    
    /// @notice Daily spending tracking: dailySpent[user][day] = amount
    mapping(address => mapping(uint256 => uint256)) public dailySpent;
    
    /// @notice Last tip timestamp per user
    mapping(address => uint256) public lastTipAt;
    
    /// @notice Blacklist addresses
    mapping(address => bool) public blacklist;
    
    /// @notice Replay protection: message hash → used status
    mapping(bytes32 => bool) public nonceUsed;
    
    /// @notice Staked amounts per user
    mapping(address => uint256) public stakeBalance;
    
    /// @notice Unstake release time per user
    mapping(address => uint256) public unstakeReleaseTime;
    
    /// @notice Unstaked amounts pending withdrawal per user
    mapping(address => uint256) public unstakedAmount;
    
    /// @notice Total tips processed
    uint256 public totalTips;
    
    /// @notice TipRouter version
    uint256 public constant VERSION = 2;
    
    // ========== EVENTS ==========
    
    /**
     * @dev Emitted when a tip is successfully submitted
     */
    event TipSubmitted(
        bytes32 indexed cidHash,
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 msgHash,
        bytes relayerSig
    );
    
    /**
     * @dev Emitted when user stakes tokens
     */
    event Staked(address indexed user, uint256 amount);
    
    /**
     * @dev Emitted when user initiates unstake
     */
    event UnstakeInitiated(address indexed user, uint256 amount, uint256 releaseTime);
    
    /**
     * @dev Emitted when user withdraws unstaked tokens
     */
    event Unstaked(address indexed user, uint256 amount);
    
    /**
     * @dev Emitted when blacklist is updated
     */
    event BlacklistUpdated(address indexed who, bool blocked);
    
    /**
     * @dev Emitted when parameters are updated
     */
    event ParamsUpdated(string param);
    
    /**
     * @dev Emitted when relayer signer is updated
     */
    event RelayerSignerUpdated(address oldSigner, address newSigner);
    
    // ========== ERRORS ==========
    
    error UnauthorizedRelayer();
    error InvalidTipAmount();
    error InvalidAddresses();
    error NonceAlreadyUsed();
    error Blacklisted();
    error SelfTip();
    error AmountExceedsCap();
    error DailyCapExceeded();
    error RateLimited();
    error ZeroAmount();
    error InvalidUnstake();
    error UnstakeNotReady();
    
    // ========== MODIFIERS ==========
    
    modifier onlyRelayer(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) {
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = ethSignedHash.recover(v, r, s);
        if (signer != relayerSigner) revert UnauthorizedRelayer();
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    
    /**
     * @dev Deploy TipRouterFair with relayer KMS address and token
     * @param _relayerSigner KMS-derived relayer address (AWS KMS, etc.)
     * @param _token ERC20 token address (VERY token)
     */
    constructor(address _relayerSigner, IERC20 _token) {
        if (_relayerSigner == address(0)) revert InvalidAddresses();
        if (address(_token) == address(0)) revert InvalidAddresses();
        
        relayerSigner = _relayerSigner;
        token = _token;
        
        // Default fairness parameters (can be updated by admin)
        minIntervalSec = 30;           // 30 seconds between tips
        maxTipAmount = 10 ether;        // 10 VERY per tx
        baseDailyCap = 50 ether;        // 50 VERY per day base
        stakeMultiplier = 1;            // 1 VERY staked = +1 VERY daily cap
        unstakeDelay = 1 days;         // 1 day unstake delay
    }
    
    // ========== VIEW HELPERS ==========
    
    /**
     * @notice Get day index from timestamp
     * @param timestamp Block timestamp
     * @return day Day index (timestamp / 1 days)
     */
    function _dayIndex(uint256 timestamp) internal pure returns (uint256) {
        return timestamp / 1 days;
    }
    
    /**
     * @notice Get current day index
     * @return day Current day index
     */
    function currentDay() public view returns (uint256) {
        return _dayIndex(block.timestamp);
    }
    
    /**
     * @notice Get effective daily cap for a user (base + staked bonus)
     * @param user User address
     * @return cap Effective daily cap in wei
     */
    function effectiveDailyCap(address user) public view returns (uint256) {
        return baseDailyCap + (stakeBalance[user] * stakeMultiplier);
    }
    
    /**
     * @notice Get message hash for signature verification
     * @param from Tipper
     * @param to Recipient
     * @param amount Amount
     * @param cidHash IPFS hash
     * @param nonce Nonce
     * @return messageHash Hash to sign
     */
    function getMessageHash(
        address from,
        address to,
        uint256 amount,
        bytes32 cidHash,
        uint256 nonce
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(from, to, amount, cidHash, nonce));
    }
    
    /**
     * @notice Check if nonce is already used
     * @param messageHash Message hash to check
     * @return isUsed True if nonce already consumed
     */
    function isNonceUsed(bytes32 messageHash) external view returns (bool isUsed) {
        return nonceUsed[messageHash];
    }
    
    /**
     * @notice Contract information for frontend
     * @return version Contract version
     * @return relayer Relayer signer
     * @return totalTipsCount Total tips processed
     */
    function contractInfo() external view returns (
        uint256 version,
        address relayer,
        uint256 totalTipsCount
    ) {
        return (VERSION, relayerSigner, totalTips);
    }
    
    // ========== CORE FUNCTIONALITY ==========
    
    /**
     * @notice Submit gasless tip via KMS-signed meta-transaction with fairness checks
     * @dev EIP-191 signature verification + replay protection + fairness controls
     * @param from Tipper address
     * @param to Recipient address  
     * @param amount Tip amount in wei (VERY tokens)
     * @param cidHash IPFS content hash (encrypted message)
     * @param nonce Unique nonce per tip
     * @param v Signature v
     * @param r Signature r
     * @param s Signature s
     */
    function submitTip(
        address from,
        address to,
        uint256 amount,
        bytes32 cidHash,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) 
        external 
        nonReentrant 
        onlyRelayer(keccak256(abi.encodePacked(from, to, amount, cidHash, nonce)), v, r, s)
    {
        // Basic validation
        if (from == address(0) || to == address(0)) revert InvalidAddresses();
        if (amount == 0) revert InvalidTipAmount();
        
        // Fairness checks
        if (blacklist[from] || blacklist[to]) revert Blacklisted();
        if (from == to) revert SelfTip();
        if (amount > maxTipAmount) revert AmountExceedsCap();
        
        // Rate limiting: minimum interval between tips
        uint256 last = lastTipAt[from];
        if (block.timestamp < last + minIntervalSec) revert RateLimited();
        lastTipAt[from] = block.timestamp;
        
        // Daily cap check
        bytes32 messageHash = keccak256(abi.encodePacked(from, to, amount, cidHash, nonce));
        if (nonceUsed[messageHash]) revert NonceAlreadyUsed();
        
        uint256 day = _dayIndex(block.timestamp);
        uint256 spentToday = dailySpent[from][day];
        uint256 cap = effectiveDailyCap(from);
        if (spentToday + amount > cap) revert DailyCapExceeded();
        
        // Mark nonce as used and update daily spending
        nonceUsed[messageHash] = true;
        dailySpent[from][day] = spentToday + amount;
        
        // Emit event for indexer (relayer handles token transfers off-chain)
        emit TipSubmitted(cidHash, from, to, amount, messageHash, abi.encodePacked(v, r, s));
        
        unchecked {
            ++totalTips;
        }
    }
    
    // ========== STAKING ==========
    
    /**
     * @notice Stake tokens to increase daily cap
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        stakeBalance[msg.sender] += amount;
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @notice Initiate unstake (with delay)
     * @param amount Amount to unstake
     */
    function initiateUnstake(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (stakeBalance[msg.sender] < amount) revert InvalidUnstake();
        
        stakeBalance[msg.sender] -= amount;
        unstakedAmount[msg.sender] += amount;
        unstakeReleaseTime[msg.sender] = block.timestamp + unstakeDelay;
        
        emit UnstakeInitiated(msg.sender, amount, unstakeReleaseTime[msg.sender]);
    }
    
    /**
     * @notice Withdraw unstaked tokens after delay
     * @param amount Amount to withdraw
     */
    function withdrawUnstaked(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (unstakedAmount[msg.sender] < amount) revert InvalidUnstake();
        if (block.timestamp < unstakeReleaseTime[msg.sender]) revert UnstakeNotReady();
        
        unstakedAmount[msg.sender] -= amount;
        token.safeTransfer(msg.sender, amount);
        
        // Reset release time if all unstaked tokens withdrawn
        if (unstakedAmount[msg.sender] == 0) {
            unstakeReleaseTime[msg.sender] = 0;
        }
        
        emit Unstaked(msg.sender, amount);
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @notice Update relayer KMS signer (owner only)
     * @param newRelayerSigner New KMS-derived address
     */
    function setRelayerSigner(address newRelayerSigner) external onlyOwner {
        if (newRelayerSigner == address(0)) revert InvalidAddresses();
        address oldSigner = relayerSigner;
        relayerSigner = newRelayerSigner;
        emit RelayerSignerUpdated(oldSigner, newRelayerSigner);
        emit ParamsUpdated("relayerSigner");
    }
    
    /**
     * @notice Update fairness parameters (owner only)
     * @param _minInterval Minimum seconds between tips
     * @param _maxTipAmount Maximum tip per transaction
     * @param _baseDailyCap Base daily cap per user
     * @param _stakeMultiplier Stake multiplier for daily cap
     */
    function setCaps(
        uint256 _minInterval,
        uint256 _maxTipAmount,
        uint256 _baseDailyCap,
        uint256 _stakeMultiplier
    ) external onlyOwner {
        minIntervalSec = _minInterval;
        maxTipAmount = _maxTipAmount;
        baseDailyCap = _baseDailyCap;
        stakeMultiplier = _stakeMultiplier;
        emit ParamsUpdated("caps");
    }
    
    /**
     * @notice Update unstake delay (owner only)
     * @param _delay New unstake delay in seconds
     */
    function setUnstakeDelay(uint256 _delay) external onlyOwner {
        unstakeDelay = _delay;
        emit ParamsUpdated("unstakeDelay");
    }
    
    /**
     * @notice Update blacklist (owner only)
     * @param who Address to blacklist/unblacklist
     * @param blocked True to blacklist, false to remove
     */
    function setBlacklist(address who, bool blocked) external onlyOwner {
        if (who == address(0)) revert InvalidAddresses();
        blacklist[who] = blocked;
        emit BlacklistUpdated(who, blocked);
    }
    
    /**
     * @notice Emergency withdraw tokens from contract (owner only)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawTokens(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidAddresses();
        token.safeTransfer(to, amount);
    }
}

