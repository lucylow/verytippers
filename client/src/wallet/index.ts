/**
 * Wallet Adapter System - Unified Export
 * 
 * This module provides a unified interface for connecting to both
 * MetaMask and Wepin Wallet, with identical UX flows.
 * 
 * Usage:
 * ```tsx
 * import { useWallet, WalletSelector } from '@/wallet';
 * 
 * function MyComponent() {
 *   const { wallet, connect, disconnect, signMessage } = useWallet();
 *   
 *   return (
 *     <WalletSelector onConnect={() => console.log('Connected!')} />
 *   );
 * }
 * ```
 */

export { WalletProvider, useWallet } from "./WalletContext";
export { WalletSelector } from "./WalletSelector";
export { MetaMaskAdapter } from "./metamask";
export { WepinAdapter } from "./wepin";
export type { WalletAdapter, WalletType } from "./types";
export {
  checkChainCompatibility,
  ensureChainCompatibility,
  REQUIRED_CHAIN_ID,
} from "./chainCompatibility";

