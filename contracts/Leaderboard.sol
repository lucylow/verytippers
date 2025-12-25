// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Leaderboard {
    // NOTE: The document suggests a complex sorting and ranking logic which is highly inefficient
    // and expensive for on-chain execution. This contract will implement the data structure
    // but the actual sorting and ranking will be handled by the off-chain backend service (Phase 3).

    address public tipContractAddress;

    modifier onlyTipContract() {
        require(msg.sender == tipContractAddress, "Only Tip Contract can call this function");
        _;
    }

    struct LeaderboardEntry {
        address user;
        uint256 score;
        uint256 rank; // Rank will be set by the off-chain service for display
    }

    // Multiple leaderboards
    mapping(string => mapping(address => LeaderboardEntry)) public userEntries;
    mapping(string => address[]) public boardUsers; // To iterate over users in a board

    // Available leaderboards
    string[] public availableBoards = [
        "weekly_tips_sent",
        "weekly_tips_received",
        "all_time_tippers",
        "badge_collectors",
        "community_funders"
    ];

    constructor(address _tipContractAddress) {
        tipContractAddress = _tipContractAddress;
    }

    function updateLeaderboard(
        address user,
        string memory boardId,
        uint256 scoreDelta
    ) external onlyTipContract {
        // Find or create entry
        if (userEntries[boardId][user].user == address(0)) {
            // New user for this board
            userEntries[boardId][user] = LeaderboardEntry({
                user: user,
                score: scoreDelta,
                rank: 0
            });
            boardUsers[boardId].push(user);
        } else {
            // Existing user
            userEntries[boardId][user].score += scoreDelta;
        }
        // NOTE: No on-chain sorting/ranking for efficiency.
    }

    function getScore(string memory boardId, address user) external view returns (uint256) {
        return userEntries[boardId][user].score;
    }

    function getBoardUsers(string memory boardId) external view returns (address[] memory) {
        return boardUsers[boardId];
    }
}
