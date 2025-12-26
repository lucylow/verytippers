/**
 * Chain Compatibility Utilities
 * Ensures wallet is on the correct chain (VERY Chain)
 */

import { WalletAdapter } from "./types";

/**
 * VERY Chain configuration
 * Update this with your actual chain ID
 */
export const REQUIRED_CHAIN_ID = 12345; // VERY testnet - update with actual chain ID

/**
 * Checks if the wallet is on the required chain
 */
export async function checkChainCompatibility(
  wallet: WalletAdapter
): Promise<{ compatible: boolean; currentChainId?: number; requiredChainId: number }> {
  try {
    const currentChainId = await wallet.getChainId();
    return {
      compatible: currentChainId === REQUIRED_CHAIN_ID,
      currentChainId,
      requiredChainId: REQUIRED_CHAIN_ID,
    };
  } catch (error) {
    console.error("Error checking chain compatibility:", error);
    return {
      compatible: false,
      requiredChainId: REQUIRED_CHAIN_ID,
    };
  }
}

/**
 * Ensures wallet is on the required chain
 * For MetaMask: prompts network switch
 * For Wepin: handles automatically
 */
export async function ensureChainCompatibility(
  wallet: WalletAdapter
): Promise<void> {
  const check = await checkChainCompatibility(wallet);

  if (check.compatible) {
    return; // Already on correct chain
  }

  // For MetaMask, prompt network switch
  if (wallet.id === "metamask" && window.ethereum) {
    try {
      const expectedChainId = `0x${REQUIRED_CHAIN_ID.toString(16)}`;
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expectedChainId }],
      });
    } catch (switchError: any) {
      // Chain not added
      if (switchError.code === 4902) {
        // You can add the chain here if needed
        throw new Error(
          `Please switch to VERY Chain (Chain ID: ${REQUIRED_CHAIN_ID})`
        );
      } else {
        throw new Error(
          `Failed to switch network: ${switchError.message || "Unknown error"}`
        );
      }
    }
  } else {
    // Wepin handles this automatically, but we can still throw if not compatible
    throw new Error(
      `Please switch to VERY Chain (Chain ID: ${REQUIRED_CHAIN_ID})`
    );
  }
}

