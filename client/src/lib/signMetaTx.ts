/**
 * Signing for Gasless Meta-Transactions
 * Works with both MetaMask and Wepin Wallet adapters
 */

import { WalletAdapter } from "@/wallet/types";
import { ethers } from "ethers";
import { MetaTx } from "@/lib/web3/metaTx";

/**
 * Signs a meta-transaction using a wallet adapter
 * Compatible with both MetaMask (EIP-191) and Wepin
 */
export async function signMetaTx(
  wallet: WalletAdapter,
  payload: MetaTx
): Promise<{ payload: MetaTx; signature: string }> {
  // Create message hash using keccak256
  // This is compatible with EIP-191 personal_sign
  const messageHash = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(payload))
  );

  // Sign the message hash
  // MetaMask → personal_sign
  // Wepin → SDK signing
  // Both produce signatures compatible with ecrecover
  const signature = await wallet.signMessage(messageHash);

  return {
    payload,
    signature,
  };
}

/**
 * Alternative: Sign using EIP-712 typed data (if wallet supports it)
 * This provides better UX and security
 */
export async function signMetaTxTyped(
  wallet: WalletAdapter,
  payload: MetaTx,
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  }
): Promise<{ payload: MetaTx; signature: string }> {
  // For MetaMask, we can use signTypedData if available
  if (wallet.id === "metamask" && "signer" in wallet) {
    const signer = (wallet as any).signer as ethers.JsonRpcSigner;
    if (signer && typeof signer.signTypedData === "function") {
      const types = {
        MetaTx: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "cid", type: "string" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const signature = await signer.signTypedData(domain, types, payload);
      return { payload, signature };
    }
  }

  // Fallback to message signing
  return signMetaTx(wallet, payload);
}

