/**
 * Meta-Transaction Orchestrator
 * Builds, signs, and submits meta-transactions via relayer
 */

import { ethers } from 'ethers';
import type { MetaTx } from '../../web3/metaTx';

/**
 * Builds the message hash for meta-transaction signing
 * Matches TipRouter.sol's getMessageHash function
 */
export function buildMetaHash(
  from: string,
  to: string,
  amount: string | bigint,
  cid: string,
  nonce: number | bigint
): { messageHash: string; cidHash: string } {
  // Convert CID string to bytes32 hash (keccak256 of CID)
  const cidHash = ethers.keccak256(ethers.toUtf8Bytes(cid));
  
  // Build message hash: keccak256(from, to, amount, cidHash, nonce)
  const messageHash = ethers.keccak256(
    ethers.solidityPacked(
      ['address', 'address', 'uint256', 'bytes32', 'uint256'],
      [
        ethers.getAddress(from),
        ethers.getAddress(to),
        BigInt(amount),
        cidHash,
        BigInt(nonce)
      ]
    )
  );
  
  return { messageHash, cidHash };
}

/**
 * Signs a message hash using EIP-191 personal_sign
 * Note: The contract expects the relayer to sign, but we need the user to sign
 * the message hash for verification. In this flow, the user signs the hash,
 * and the relayer will verify and forward to the contract.
 * 
 * @param provider Ethereum provider (window.ethereum)
 * @param messageHash The message hash to sign (already hashed)
 * @returns Signature string
 */
export async function userSignMeta(
  provider: ethers.Eip1193Provider,
  messageHash: string
): Promise<string> {
  try {
    // Convert hex string to bytes
    const messageBytes = ethers.getBytes(messageHash);
    
    // Get signer from provider
    const browserProvider = new ethers.BrowserProvider(provider);
    const signer = await browserProvider.getSigner();
    
    // Sign the message hash (EIP-191 will add prefix automatically)
    // Note: signMessage adds "\x19Ethereum Signed Message:\n32" prefix
    // But we want to sign the raw hash, so we use signMessage with the hash as bytes
    const signature = await signer.signMessage(messageBytes);
    return signature;
  } catch (error: any) {
    if (error?.code === 'ACTION_REJECTED' || error?.code === 4001) {
      throw new Error('User rejected signature request');
    }
    throw new Error(`Failed to sign message: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Converts a signature string to v, r, s components
 * @param signature Signature string (0x...)
 * @returns Object with v, r, s
 */
export function splitSignature(signature: string): { v: number; r: string; s: string } {
  const sig = ethers.Signature.from(signature);
  return {
    v: sig.v,
    r: sig.r,
    s: sig.s
  };
}

/**
 * Submits a meta-transaction to the relayer
 * @param relayerUrl Relayer endpoint URL
 * @param payload Meta-transaction payload with signature components
 * @returns Transaction hash
 */
export async function submitToRelayer(
  relayerUrl: string,
  payload: {
    from: string;
    to: string;
    amount: string;
    cidHash: string;
    nonce: number;
    v: number;
    r: string;
    s: string;
  }
): Promise<{ txHash: string; status: string; mock?: boolean }> {
  try {
    const response = await fetch(`${relayerUrl}/submit-meta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Relayer error: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      txHash: result.txHash,
      status: result.status || 'pending',
      mock: result.mock || false
    };
  } catch (error) {
    throw new Error(`Failed to submit to relayer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Complete meta-transaction flow: build, sign, submit
 * @param provider Ethereum provider
 * @param metaTx Meta-transaction data
 * @param relayerUrl Relayer endpoint URL
 * @returns Transaction hash
 */
export async function submitMetaTxFlow(
  provider: ethers.Eip1193Provider,
  metaTx: MetaTx,
  relayerUrl: string = import.meta.env.VITE_APP_RELAYER_URL || 'http://localhost:8080'
): Promise<{ txHash: string; status: string; mock?: boolean }> {
  // 1. Build message hash and CID hash
  const { messageHash, cidHash } = buildMetaHash(
    metaTx.from,
    metaTx.to,
    metaTx.amount,
    metaTx.cid,
    metaTx.nonce
  );

  // 2. Sign with user wallet
  const signature = await userSignMeta(provider, messageHash);

  // 3. Split signature into v, r, s
  const { v, r, s } = splitSignature(signature);

  // 4. Submit to relayer
  return await submitToRelayer(relayerUrl, {
    from: metaTx.from,
    to: metaTx.to,
    amount: metaTx.amount,
    cidHash,
    nonce: metaTx.nonce,
    v,
    r,
    s
  });
}

