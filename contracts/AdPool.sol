// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title AdPool
 * @notice Simple pool contract for receiving ad sponsorship funds
 * @dev For MVP/testnet use. In production, should use DAO or multisig for payouts.
 */
contract AdPool {
    address public owner;
    
    event PoolFunded(address indexed from, uint256 amount);
    event Payout(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Receive ETH payments
     */
    receive() external payable {
        emit PoolFunded(msg.sender, msg.value);
    }

    /**
     * @notice Fallback function
     */
    fallback() external payable {
        emit PoolFunded(msg.sender, msg.value);
    }

    /**
     * @notice Payout funds to a recipient (owner only)
     * @param to Address to send funds to
     * @param amount Amount to send in wei
     */
    function payout(address payable to, uint256 amount) external {
        require(msg.sender == owner, "AdPool: only owner");
        require(address(this).balance >= amount, "AdPool: insufficient balance");
        require(to != address(0), "AdPool: invalid recipient");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "AdPool: transfer failed");
        
        emit Payout(to, amount);
    }

    /**
     * @notice Withdraw funds to owner (owner only)
     * @param amount Amount to withdraw in wei
     */
    function withdraw(uint256 amount) external {
        require(msg.sender == owner, "AdPool: only owner");
        require(address(this).balance >= amount, "AdPool: insufficient balance");
        
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "AdPool: transfer failed");
        
        emit Payout(owner, amount);
    }

    /**
     * @notice Get current pool balance
     * @return Balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Transfer ownership (owner only)
     * @param newOwner Address of new owner
     */
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "AdPool: only owner");
        require(newOwner != address(0), "AdPool: invalid new owner");
        
        address oldOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

