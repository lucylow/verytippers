/**
 * Unified Wallet Adapter Interface
 * Supports MetaMask (EIP-1193) and Wepin Wallet
 * Production-grade abstraction for dual-wallet integration
 */

export interface WalletAdapter {
  id: "metamask" | "wepin";
  name: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  getAddress(): Promise<string>;
  getChainId(): Promise<number>;

  signMessage(message: string): Promise<string>;
}

export type WalletType = "metamask" | "wepin";

