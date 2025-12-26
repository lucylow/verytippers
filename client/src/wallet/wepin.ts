/**
 * Wepin Wallet Adapter
 * Supports embedded wallet, mobile, iframe, and Lovable
 * Uses @wepin/sdk-js with proper initialization and error handling
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
    
    // Set up event listeners for account changes
    this.wepinWallet.on('accountChanged', (account) => {
      if (account) {
        this.account = {
          address: account.address,
          chainId: account.chainId,
        };
      } else {
        this.account = null;
      }
    });

    this.wepinWallet.on('error', (error) => {
      console.error('Wepin adapter error:', error);
    });
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

      await this.wepinWallet.initialize({
        appId,
        appKey,
        attributes: {
          defaultLanguage: 'en',
          defaultCurrency: 'USD',
        },
      });
      this.initialized = true;
    }

    // Connect wallet
    const wepinAccount = await this.wepinWallet.connect();
    this.account = {
      address: wepinAccount.address,
      chainId: wepinAccount.chainId,
    };
  }

  async disconnect() {
    if (this.wepinWallet && this.initialized) {
      try {
        await this.wepinWallet.disconnect();
      } catch (error) {
        console.error('Error disconnecting Wepin wallet:', error);
        // Continue with cleanup even if disconnect fails
      }
      this.account = null;
      // Note: We don't set initialized to false to allow reconnection
      // If you want to fully reset, call finalize() instead
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

    try {
      // Use the improved signMessage method from WepinWallet
      return await this.wepinWallet.signMessage(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Wepin message signing failed: ${errorMessage}`);
    }
  }

  /**
   * Get the underlying WepinWallet instance for advanced usage
   */
  getWallet(): WepinWallet {
    return this.wepinWallet;
  }

  /**
   * Check if wallet is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Finalize and cleanup resources
   */
  async finalize(): Promise<void> {
    if (this.wepinWallet) {
      await this.wepinWallet.finalize();
      this.initialized = false;
      this.account = null;
    }
  }
}

