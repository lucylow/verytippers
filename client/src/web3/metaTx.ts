/**
 * Meta-Transaction Builder (Shared)
 * Creates structured meta-transactions for tip submissions
 */

export interface MetaTx {
  from: string;
  to: string;
  amount: string; // BigInt as string
  cid: string; // IPFS CID for message
  nonce: number;
}

/**
 * Builds a meta-transaction object
 */
export function buildMetaTx({
  from,
  to,
  amount,
  cid,
  nonce
}: {
  from: string;
  to: string;
  amount: number; // Amount in VERY tokens (will be converted to wei)
  cid: string;
  nonce: number;
}): MetaTx {
  return {
    from,
    to,
    amount: BigInt(Math.floor(amount * 1e18)).toString(),
    cid,
    nonce
  };
}


