/**
 * Wallet Connector (Real + Mock)
 * Provides signer interface for both real wallet connections and mock fallback
 */

/// <reference types="../vite-env" />
import { ethers } from "ethers";

export interface Signer {
  getAddress: () => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

/**
 * Gets a real signer from the connected wallet (MetaMask, etc.)
 * Returns null if no wallet is available
 */
export async function getSigner(): Promise<ethers.JsonRpcSigner | null> {
  if (!window.ethereum) return null;

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    // Request account access (this will prompt user if not already connected)
    await provider.send("eth_requestAccounts", []);
    return await provider.getSigner();
  } catch (error) {
    console.warn("Failed to get real signer:", error);
    return null;
  }
}

/**
 * Fallback mock signer - always works, even offline
 * Used when wallet is not available or RPC is down
 */
export function getMockSigner(): Signer {
  return {
    getAddress: async () => "0xMockUser000000000000000000000000000001",
    signMessage: async (msg: string) => {
      return "0xMOCK_SIGNATURE_" + btoa(msg).slice(0, 16).padEnd(132, "0");
    }
  };
}

/**
 * Checks if a real wallet is available
 */
export function isWalletAvailable(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

/**
 * Checks if RPC is healthy by attempting a simple call
 */
export async function isRpcHealthy(rpcUrl: string): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    await provider.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}

