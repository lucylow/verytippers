/**
 * REAL Testnet Submission (Relayer Path)
 * Submits actual transactions to the blockchain via contract
 */

import { ethers } from "ethers";
import { CONTRACTS, VERY_TESTNET } from "./config";
import type { MetaTx } from "./metaTx";

export interface TipSubmissionResult {
  txHash: string;
  explorerUrl: string;
  status: "pending" | "confirmed" | "failed";
  receipt?: {
    event: string;
    from: string;
    to: string;
    amount: number;
    cid: string;
    blockNumber: number;
  };
}

/**
 * Submits a real tip transaction to the blockchain
 */
export async function submitRealTip({
  signer,
  metaTx
}: {
  signer: ethers.JsonRpcSigner;
  metaTx: MetaTx;
}): Promise<TipSubmissionResult> {
  const contract = new ethers.Contract(
    CONTRACTS.tipRouter.address,
    CONTRACTS.tipRouter.abi,
    signer
  );

  // Convert MetaTx to tuple format expected by contract
  // ethers will handle the tuple conversion automatically based on the ABI
  const metaTxTuple: [string, string, string, number] = [
    metaTx.to,
    metaTx.amount,
    metaTx.cid,
    metaTx.nonce
  ];

  try {
    const tx = await contract.submitTip(metaTxTuple);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();

    // Extract event data if available
    let receiptData;
    if (receipt?.logs) {
      const event = contract.interface.parseLog(receipt.logs[0]);
      if (event?.name === "TipSubmitted") {
        receiptData = {
          event: "TipSubmitted",
          from: event.args.from,
          to: event.args.to,
          amount: Number(event.args.amount) / 1e18,
          cid: event.args.cid,
          blockNumber: receipt.blockNumber
        };
      }
    }

    return {
      txHash: tx.hash,
      explorerUrl: `${VERY_TESTNET.blockExplorerUrls[0]}/tx/${tx.hash}`,
      status: receipt?.status === 1 ? "confirmed" : "failed",
      receipt: receiptData
    };
  } catch (error) {
    console.error("Real tip submission failed:", error);
    throw error;
  }
}

