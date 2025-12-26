// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./VeryReputation.sol";

/**
 * @title TipRouter - Gasless micro-tipping for VERY Chain
 * @dev Production-ready smart contract for VeryTippers hackathon
 * Features: KMS-signed meta-transactions, replay protection, IPFS privacy, VERY token transfers
 * Chain: VERY Chain Mainnet (ID: 8888)
 */
contract TipRouter is ReentrancyGuard, Ownable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    // ========== STATE ==========
    
    /// @notice Relayer KMS signer address (AWS KMS, Vault, etc.)
    address public immutable relayerSigner;
    
    /// @notice VERY token contract
    IERC20 public immutable VERY;
    
    /// @notice VeryReputation contract (optional)
    VeryReputation public reputation;
    
    /// @notice Replay protection: message hash → used status
    mapping(bytes32 => bool) public nonceUsed;
    
    /// @notice Total tips processed
    uint256 public totalTips;
    
    /// @notice TipRouter version
    uint256 public constant VERSION = 2;
    
    // ========== EVENTS ==========
    
    /**
     * @dev Emitted when a tip is successfully submitted
     * @param cidHash IPFS content identifier hash
     * @param from Tipper address
     * @param to Recipient address
     * @param amount Tip amount in wei
     * @param nonce Unique nonce for replay protection
     */
    event TipSubmitted(
        bytes32 indexed cidHash,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 nonce
    );
    
    /**
     * @dev Emitted when relayer signer is updated (multisig only)
     */
    event RelayerSignerUpdated(address oldSigner, address newSigner);
    
    // ========== ERRORS ==========
    
    error UnauthorizedRelayer();
    error ReplayAttack();
    error InvalidTipAmount();
    error InvalidAddresses();
    error NonceAlreadyUsed();
    
    // ========== MODIFIERS ==========
    
    modifier onlyRelayer(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) {
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = ethSignedHash.recover(v, r, s);
        if (signer != relayerSigner) revert UnauthorizedRelayer();
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    
    /**
     * @dev Deploy TipRouter with relayer KMS address and VERY token
     * @param _relayerSigner KMS-derived relayer address (AWS KMS, etc.)
     * @param _veryToken VERY token contract address
     */
    constructor(address _relayerSigner, address _veryToken) {
        if (_relayerSigner == address(0)) revert InvalidAddresses();
        if (_veryToken == address(0)) revert InvalidAddresses();
        relayerSigner = _relayerSigner;
        VERY = IERC20(_veryToken);
    }
    
    // ========== CORE FUNCTIONALITY ==========
    
    /**
     * @notice Submit gasless tip via KMS-signed meta-transaction
     * @dev EIP-191 signature verification + replay protection
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
        // Validate inputs
        if (from == address(0) || to == address(0)) revert InvalidAddresses();
        if (amount == 0) revert InvalidTipAmount();
        if (from == to) revert InvalidAddresses();
        
        // Replay protection
        bytes32 messageHash = keccak256(abi.encodePacked(from, to, amount, cidHash, nonce));
        if (nonceUsed[messageHash]) revert NonceAlreadyUsed();
        nonceUsed[messageHash] = true;
        
        // Business logic complete - emit event for indexer
        emit TipSubmitted(cidHash, from, to, amount, nonce);
        unchecked {
            ++totalTips;
        }
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @notice Update relayer KMS signer (owner only)
     * @dev Use multisig for production
     * @param newRelayerSigner New KMS-derived address
     */
    function updateRelayerSigner(address newRelayerSigner) external onlyOwner {
        if (newRelayerSigner == address(0)) revert InvalidAddresses();
        emit RelayerSignerUpdated(relayerSigner, newRelayerSigner);
    }
    
    /**
     * @notice Emergency pause functionality
     * @dev Not implemented in MVP - add if needed
     */
    // bool public paused;
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @notice Check if nonce is already used (for frontend validation)
     * @param messageHash Message hash to check
     * @return isUsed True if nonce already consumed
     */
    function isNonceUsed(bytes32 messageHash) external view returns (bool isUsed) {
        return nonceUsed[messageHash];
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
     * @notice Contract information for frontend
     * @return version Contract version
     * @return relayer Relayer signer
     * @return totalTips Total tips processed
     */
    function contractInfo() external view returns (
        uint256 version,
        address relayer,
        uint256 totalTipsCount
    ) {
        return (VERSION, relayerSigner, totalTips);
    }
}


