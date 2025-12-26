/**
 * Frontend UX Hook (Feels REAL)
 * Provides tip submission functionality with loading states
 */

import { useState } from "react";
import { submitTip } from "@/web3/submitTip";
import { buildMetaTx } from "@/web3/metaTx";
import type { TipSubmissionResult } from "@/web3/submitRealTip";

export type TipStatus = "idle" | "signing" | "sending" | "done" | "error";

export interface UseTipReturn {
  sendTip: (params: {
    from: string;
    to: string;
    amount: number;
    cid: string;
    nonce: number;
  }) => Promise<TipSubmissionResult | null>;
  status: TipStatus;
  tx: TipSubmissionResult | null;
  error: string | null;
  reset: () => void;
}

/**
 * Hook for submitting tips with real blockchain or mock fallback
 */
export function useTip(): UseTipReturn {
  const [status, setStatus] = useState<TipStatus>("idle");
  const [tx, setTx] = useState<TipSubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendTip = async ({
    from,
    to,
    amount,
    cid,
    nonce
  }: {
    from: string;
    to: string;
    amount: number;
    cid: string;
    nonce: number;
  }): Promise<TipSubmissionResult | null> => {
    setStatus("signing");
    setError(null);

    try {
      // Build meta-transaction
      const metaTx = buildMetaTx({
        from,
        to,
        amount,
        cid,
        nonce
      });

      setStatus("sending");

      // Submit tip (will use real blockchain or fallback to mock)
      const result = await submitTip(metaTx);

      setTx(result);
      setStatus("done");
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send tip";
      setError(errorMessage);
      setStatus("error");
      console.error("Tip submission error:", err);
      return null;
    }
  };

  const reset = () => {
    setStatus("idle");
    setTx(null);
    setError(null);
  };

  return {
    sendTip,
    status,
    tx,
    error,
    reset
  };
}


