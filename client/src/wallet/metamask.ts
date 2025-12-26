/**
 * MetaMask Adapter (EIP-1193)
 * Compatible with MetaMask and other EIP-1193 wallets
 */

import { WalletAdapter } from "./types";
import { ethers } from "ethers";

export class MetaMaskAdapter implements WalletAdapter {
  id = "metamask" as const;
  name = "MetaMask";

  provider!: ethers.BrowserProvider;
  signer!: ethers.JsonRpcSigner;

  async connect() {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    await this.provider.send("eth_requestAccounts", []);
    this.signer = await this.provider.getSigner();
  }

  async disconnect() {
    // MetaMask does not support programmatic disconnect
    // User must disconnect manually from the extension
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (error) {
        // Ignore errors - some wallets don't support this
        console.warn("Failed to revoke permissions:", error);
      }
    }
  }

  async getAddress() {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }
    return this.signer.getAddress();
  }

  async getChainId() {
    if (!this.provider) {
      throw new Error("Wallet not connected");
    }
    const network = await this.provider.getNetwork();
    return Number(network.chainId);
  }

  async signMessage(message: string) {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }
    // Uses EIP-191 personal_sign (compatible with relayer + TipRouter)
    return this.signer.signMessage(message);
  }
}

