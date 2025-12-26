/**
 * Wepin Wallet Adapter
 * Supports embedded wallet, mobile, iframe, and Lovable
 * Uses @wepin/sdk-js or falls back to window.Wepin
 */

import { WalletAdapter } from "./types";
import { WepinWallet } from "@/lib/wepin/wepin";

export class WepinAdapter implements WalletAdapter {
  id = "wepin" as const;
  name = "Wepin Wallet";

  private wepinWallet: WepinWallet;
  private initialized = false;
  private account: { address: string; chainId: number } | null = null;

  constructor() {
    this.wepinWallet = new WepinWallet();
  }

  async connect() {
    if (!this.initialized) {
      const appId = import.meta.env.VITE_WEPIN_APP_ID;
      const appKey = import.meta.env.VITE_WEPIN_APP_KEY;

      if (!appId || !appKey) {
        throw new Error(
          "Wepin App ID and App Key must be set in environment variables.\n" +
          "Set VITE_WEPIN_APP_ID and VITE_WEPIN_APP_KEY in your .env file."
        );
      }

      await this.wepinWallet.initialize(appId, appKey);
      this.initialized = true;
    }

    // Connect wallet
    this.account = await this.wepinWallet.connect();
  }

  async disconnect() {
    if (this.wepinWallet && this.initialized) {
      await this.wepinWallet.disconnect();
      this.account = null;
      this.initialized = false;
    }
  }

  async getAddress() {
    if (!this.initialized || !this.account) {
      throw new Error("Wallet not connected");
    }
    return this.account.address;
  }

  async getChainId() {
    if (!this.initialized || !this.account) {
      throw new Error("Wallet not connected");
    }
    return this.account.chainId;
  }

  async signMessage(message: string) {
    if (!this.initialized || !this.account) {
      throw new Error("Wallet not connected");
    }

    // For now, we'll use a provider-based approach if available
    // This is a placeholder - actual implementation depends on Wepin SDK API
    try {
      const provider = await this.wepinWallet.getProvider();
      if (provider && typeof provider.signMessage === "function") {
        return await provider.signMessage(message);
      }
      // Fallback: if Wepin SDK provides direct signing
      throw new Error("Wepin message signing not yet implemented. Please use MetaMask for now.");
    } catch (error) {
      // If provider approach fails, try alternative methods
      // This will need to be updated based on actual Wepin SDK API
      throw new Error(
        `Wepin message signing not available: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

