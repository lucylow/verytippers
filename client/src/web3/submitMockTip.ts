/**
 * FALLBACK MOCK RELAYER (CORE OF YOUR ASK)
 * Always works, even offline.
 * Simulates transaction submission without requiring blockchain connection
 */

import type { TipSubmissionResult } from "./submitRealTip";

/**
 * Submits a mock tip (fallback when real blockchain is unavailable)
 * Simulates latency and returns a fake transaction hash
 */
export async function submitMockTip({
  from,
  to,
  amount,
  cid
}: {
  from: string;
  to: string;
  amount: number;
  cid: string;
}): Promise<TipSubmissionResult> {
  // Simulate network latency (900ms delay)
  await new Promise((r) => setTimeout(r, 900));

  // Generate a realistic-looking fake transaction hash
  const fakeTxHash =
    "0xMOCK" +
    Math.random().toString(16).slice(2).padEnd(60, "0");

  // Generate a fake block number
  const fakeBlockNumber = Math.floor(Math.random() * 1000000) + 100000;

  return {
    txHash: fakeTxHash,
    explorerUrl: `https://explorer.testnet.very.network/tx/${fakeTxHash}`,
    status: "confirmed",
    receipt: {
      event: "TipSubmitted",
      from,
      to,
      amount,
      cid,
      blockNumber: fakeBlockNumber
    }
  };
}

