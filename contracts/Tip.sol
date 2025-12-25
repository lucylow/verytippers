// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VeryTippers is Ownable {
    using SafeERC20 for IERC20;

    struct Tip {
        address from;
        address to;
        address token;
        uint256 amount;
        uint256 timestamp;
        string messageHash; // IPFS hash of encrypted message
    }

    // Supported tokens (VERY, USDC, etc.)
    mapping(address => bool) public supportedTokens;
    // User stats
    mapping(address => uint256) public totalTipsSent;
    mapping(address => uint256) public totalTipsReceived;
    mapping(address => mapping(address => uint256)) public tokenBalances; // user => token => balance

    Tip[] public allTips;
    mapping(address => Tip[]) public userTipsGiven;
    mapping(address => Tip[]) public userTipsReceived;

    event TipSent(
        address indexed from,
        address indexed to,
        address token,
        uint256 amount,
        string messageHash,
        uint256 tipId
    );
    event TokenSupported(address token, bool supported);

    // Placeholder for VERY token address (replace with actual address on deployment)
    address public VERY_TOKEN_ADDRESS = 0x0000000000000000000000000000000000000001; 

    constructor() Ownable(msg.sender) {
        // Initialize with a placeholder VERY token address
        supportedTokens[VERY_TOKEN_ADDRESS] = true;
    }

    function tip(
        address recipient,
        address token,
        uint256 amount,
        string memory messageHash
    ) external {
        require(supportedTokens[token], "Token not supported");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");

        // Transfer tokens from sender to contract (will forward to recipient)
        // NOTE: In the original document, the contract holds the funds and allows withdrawal.
        // The transfer logic is updated to reflect the document's `safeTransferFrom` and `withdraw` pattern.
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Store tip
        Tip memory newTip = Tip({
            from: msg.sender,
            to: recipient,
            token: token,
            amount: amount,
            timestamp: block.timestamp,
            messageHash: messageHash
        });

        uint256 tipId = allTips.length;
        allTips.push(newTip);

        // Update stats
        totalTipsSent[msg.sender] += amount;
        totalTipsReceived[recipient] += amount;
        tokenBalances[recipient][token] += amount; // Funds are held by the contract until withdrawal
        userTipsGiven[msg.sender].push(newTip);
        userTipsReceived[recipient].push(newTip);

        emit TipSent(msg.sender, recipient, token, amount, messageHash, tipId);
    }

    function withdraw(address token) external {
        uint256 balance = tokenBalances[msg.sender][token];
        require(balance > 0, "No balance to withdraw");

        tokenBalances[msg.sender][token] = 0;
        IERC20(token).safeTransfer(msg.sender, balance);
    }

    // Admin functions
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
        emit TokenSupported(token, true);
    }

    function getTipCount() external view returns (uint256) {
        return allTips.length;
    }

    function getUserTips(address user, bool isGiven)
        external
        view
        returns (Tip[] memory)
    {
        return isGiven ? userTipsGiven[user] : userTipsReceived[user];
    }
}
