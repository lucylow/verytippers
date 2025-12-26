/**
 * Types for the improved mock backend system
 */

export type User = {
  id: string;
  handle: string; // e.g. "alice"
  displayName: string;
  balance: number; // in VERY
  avatarColor?: string;
};

export type Tip = {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  cid?: string; // IPFS CID (mock)
  signedPayload?: string; // Client-signed payload (mock)
  txHash?: string; // Mock chain tx
  confirmed?: boolean;
  createdAt: number;
};

export type MetaTx = {
  metaTxId: string;
  to: string;
  amount: number;
  cid: string;
  nonce: number;
  signature?: string; // Relayer signature (mock)
};

