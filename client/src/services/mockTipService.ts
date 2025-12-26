// src/services/mockTipService.ts
export async function sendMetaTip(payload: { from: string; to: string; amount: number; cid?: string }) {
  // simulate network latency
  await new Promise((r) => setTimeout(r, 600));
  // return a simulated metaTx id
  return {
    metaTxId: `meta_${Date.now()}`,
    status: "queued",
  };
}

export async function simulateRelayerSubmission(metaTxId: string) {
  await new Promise((r) => setTimeout(r, 900));
  // return simulated tx hash (testnet)
  return {
    txHash: `0x${Math.random().toString(16).slice(2, 10)}...test`,
    confirmed: true,
  };
}

