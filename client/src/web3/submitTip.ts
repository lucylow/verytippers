/**
 * Smart Router (AUTO FALLBACK)
 * Decision rule:
 * if (walletAvailable && rpcHealthy && contractConfigured) {
 *   useRealTestnetFlow()
 * } else {
 *   useMockFallbackFlow()
 * }
 */

import { getSigner, getMockSigner, isWalletAvailable, isRpcHealthy } from "./wallet";
import { submitRealTip } from "./submitRealTip";
import { submitMockTip } from "./submitMockTip";
import { VERY_TESTNET } from "./config";
import type { MetaTx } from "./metaTx";
import type { TipSubmissionResult } from "./submitRealTip";

/**
 * Submits a tip using real blockchain if available, otherwise falls back to mock
 * This is the main entry point for tip submissions
 */
export async function submitTip(metaTx: MetaTx): Promise<TipSubmissionResult> {
  try {
    // Check if wallet is available
    if (!isWalletAvailable()) {
      throw new Error("No wallet available");
    }

    // Try to get real signer
    const signer = await getSigner();
    if (!signer) {
      throw new Error("No wallet signer available");
    }

    // Check if RPC is healthy
    const rpcUrl = VERY_TESTNET.rpcUrls[0];
    const rpcHealthy = await isRpcHealthy(rpcUrl);
    if (!rpcHealthy) {
      throw new Error("RPC is not healthy");
    }

    // Try real submission
    return await submitRealTip({ signer, metaTx });
  } catch (err) {
    console.warn("⚠️ Using fallback mock relayer:", err);

    // Fallback to mock
    const mockSigner = getMockSigner();
    const from = await mockSigner.getAddress();

    return submitMockTip({
      from,
      to: metaTx.to,
      amount: Number(metaTx.amount) / 1e18,
      cid: metaTx.cid
    });
  }
}


