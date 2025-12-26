// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TipRouter.sol";

/**
 * @title TipFactory - Factory for deploying TipRouter instances
 * @dev Optional factory for multi-tenant deployments
 */
contract TipFactory {
    event TipRouterDeployed(address indexed router, address indexed relayerSigner);
    
    function deployTipRouter(address relayerSigner) external returns (address router) {
        router = address(new TipRouter(relayerSigner));
        emit TipRouterDeployed(router, relayerSigner);
    }
}

