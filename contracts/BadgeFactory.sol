// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BadgeFactory is ERC721, Ownable {
    // Reference to the Tip contract
    address public tipContractAddress;

    struct Badge {
        string name;
        string description;
        string imageURI;
        uint256 requirement;
        bool isCommunityFunded;
        uint256 poolBalance;
    }

    Badge[] public badges;
    mapping(uint256 => mapping(address => bool)) public hasBadge;
    mapping(address => uint256[]) public userBadges;

    // Achievement triggers (simplified for on-chain tracking)
    mapping(address => uint256) public tipStreak; // Days in a row
    mapping(address => uint256) public uniqueUsersTipped;

    event BadgeMinted(address indexed user, uint256 badgeId);
    event BadgeCreated(uint256 badgeId, string name, uint256 requirement);

    constructor(address _tipContractAddress) ERC721("VeryTippersBadge", "VTB") Ownable(msg.sender) {
        tipContractAddress = _tipContractAddress;
        // Placeholder badge creation
        badges.push(Badge({
            name: "First Tip",
            description: "Sent your very first tip.",
            imageURI: "ipfs://...",
            requirement: 1,
            isCommunityFunded: false,
            poolBalance: 0
        }));
        badges.push(Badge({
            name: "Generous Soul",
            description: "Sent 10 or more tips.",
            imageURI: "ipfs://...",
            requirement: 10,
            isCommunityFunded: false,
            poolBalance: 0
        }));
    }

    // Simplified external function to be called by the Tip contract or a trusted backend service
    function checkAndAwardBadges(address user, uint256 totalTipsSent) external {
        require(msg.sender == tipContractAddress || msg.sender == owner(), "Only Tip Contract or Owner can call");

        // "First Tip" badge
        if (totalTipsSent > 0 && !hasBadge[0][user]) {
            _mintBadge(user, 0);
        }
        // "Generous Soul" badge (10+ tips)
        if (totalTipsSent >= 10 && !hasBadge[1][user]) {
            _mintBadge(user, 1);
        }
        // Other badge logic would go here...
    }

    function _mintBadge(address to, uint256 badgeId) internal {
        uint256 tokenId = (badgeId * 1000000) + userBadges[to].length; // Simple token ID generation
        _safeMint(to, tokenId);
        hasBadge[badgeId][to] = true;
        userBadges[to].push(badgeId);
        emit BadgeMinted(to, badgeId);
    }

    // Community can fund badge pools
    function contributeToBadgePool(uint256 badgeId) external payable {
        require(badgeId < badges.length, "Invalid badge ID");
        badges[badgeId].poolBalance += msg.value;
    }
}
