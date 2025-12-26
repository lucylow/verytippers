// src/lib/tips.ts
import { ethers } from 'ethers';
import { buildMetaHash, userSignMeta } from './orchestrator/metaTx';

// meta payload signing for EIP-191 / personal_sign
export async function signMetaPayload(provider: ethers.BrowserProvider | ethers.Eip1193Provider, meta: {
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  cid?: string;
  nonce?: number;
}) {
  // provider: ethers BrowserProvider or EIP-1193 provider (e.g. window.ethereum)
  let browserProvider: ethers.BrowserProvider;
  if (provider instanceof ethers.BrowserProvider) {
    browserProvider = provider;
  } else {
    browserProvider = new ethers.BrowserProvider(provider);
  }
  const signer = await browserProvider.getSigner();
  
  // Use existing buildMetaHash for consistency (requires nonce, defaults to 0)
  const nonce = meta.nonce ?? 0;
  const cid = meta.cid || '';
  const { messageHash } = buildMetaHash(
    meta.from,
    meta.to,
    meta.amount,
    cid,
    nonce
  );
  
  // Sign using EIP-191 personal_sign
  const signature = await signer.signMessage(ethers.getBytes(messageHash));
  
  return { signature, messageHash };
}

// Server-side verification helper (for reference)
export function verifyMeta(meta: {
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  cid?: string;
  nonce?: number;
}, signature: string) {
  const nonce = meta.nonce ?? 0;
  const cid = meta.cid || '';
  const { messageHash } = buildMetaHash(
    meta.from,
    meta.to,
    meta.amount,
    cid,
    nonce
  );
  
  // Verify signature
  const signer = ethers.verifyMessage(ethers.getBytes(messageHash), signature);
  return signer.toLowerCase() === meta.from.toLowerCase();
}

