/**
 * Relayer Worker - Processes meta-transactions from queue
 * Supports AWS KMS signing and local private key fallback
 * 
 * Usage:
 *   ts-node relayer/src/relayer-worker.ts
 *   or
 *   node dist/relayer-worker.js
 */

import Redis from 'ioredis';
import { getSupabaseClient } from '../lib/supabase';
import { KMSClient, SignCommand } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { canSubmitTip } from './fairness-check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize services
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

// Initialize Supabase (centralized client)
const supabase = getSupabaseClient();

// AWS KMS configuration
const kmsClient = process.env.KMS_KEY_ID ? new KMSClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
}) : null;

// Ethereum provider
const rpcUrl = process.env.RELAYER_ETH_RPC || process.env.VERY_CHAIN_RPC_URL || 'https://rpc.testnet.verychain.org';
const provider = new ethers.JsonRpcProvider(rpcUrl);

// TipRouter contract
const tipRouterAddress = process.env.TIPROUTER_ADDRESS || process.env.TIP_CONTRACT_ADDRESS || '';
const tipRouterAbiPath = process.env.TIPROUTER_ABI_PATH || path.resolve(__dirname, '../../contracts/abis/TipRouter.json');

let tipRouterAbi: any[] = [];
try {
  if (fs.existsSync(tipRouterAbiPath)) {
    const abiContent = fs.readFileSync(tipRouterAbiPath, 'utf8');
    tipRouterAbi = JSON.parse(abiContent);
  } else {
    // Fallback minimal ABI
    tipRouterAbi = [
      "function submitTip(address from, address to, uint256 amount, bytes32 cidHash, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external",
      "event TipSubmitted(bytes32 indexed cidHash, address indexed from, address indexed to, uint256 amount, uint256 nonce)"
    ];
    console.warn('⚠️  TipRouter ABI file not found, using minimal ABI');
  }
} catch (err) {
  console.error('Error loading TipRouter ABI:', err);
  process.exit(1);
}

const tipRouter = tipRouterAddress ? new ethers.Contract(tipRouterAddress, tipRouterAbi, provider) : null;

// Relayer wallet (for submitting transactions)
const relayerPrivateKey = process.env.LOCAL_RELAYER_PRIVATE_KEY || process.env.SPONSOR_PRIVATE_KEY || '';
let relayerSigner: ethers.Wallet | null = null;

if (relayerPrivateKey) {
  relayerSigner = new ethers.Wallet(relayerPrivateKey, provider);
  console.log('✅ Relayer wallet initialized:', relayerSigner.address);
} else {
  console.error('❌ RELAYER_PRIVATE_KEY or SPONSOR_PRIVATE_KEY not set');
  process.exit(1);
}

// KMS signing function
async function signWithKmsDigest(digestHex: string): Promise<string> {
  if (!kmsClient || !process.env.KMS_KEY_ID) {
    throw new Error('KMS not configured');
  }

  // Remove 0x prefix if present
  const digestBytes = Buffer.from(digestHex.replace(/^0x/, ''), 'hex');
  
  if (digestBytes.length !== 32) {
    throw new Error('Digest must be 32 bytes');
  }

  const cmd = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: digestBytes,
    MessageType: 'DIGEST',
    SigningAlgorithm: 'ECDSA_SHA_256'
  });

  const resp = await kmsClient.send(cmd);
  if (!resp.Signature) {
    throw new Error('No signature from KMS');
  }

  // KMS returns DER-encoded signature, convert to r, s, v
  const sig = Buffer.from(resp.Signature);
  
  // Parse DER signature to r, s, v
  // For simplicity, we'll use ethers to handle this
  // In production, you may need a DER-to-r-s-v converter
  const signature = ethers.Signature.from({
    r: '0x' + sig.slice(0, 32).toString('hex'),
    s: '0x' + sig.slice(32, 64).toString('hex'),
    v: sig[64] || 27
  });

  return ethers.Signature.from(signature).serialized;
}

// Local signing fallback (for testing)
async function signWithLocalKey(digestHex: string): Promise<ethers.Signature> {
  if (!relayerSigner) {
    throw new Error('Relayer signer not initialized');
  }

  // Sign the digest
  const messageHash = ethers.getBytes(digestHex);
  const signature = await relayerSigner.signMessage(messageHash);
  return ethers.Signature.from(signature);
}

/**
 * Process one meta-transaction from the queue
 */
async function processOne(): Promise<void> {
  try {
    // Try to get from Redis queue first
    let item: string | null = null;
    try {
      item = await redis.rpop('metaTxQueue');
    } catch (redisErr) {
      console.warn('Redis pop failed (non-critical):', redisErr);
    }

    // If no Redis item, query database directly
    if (!item) {
      const { data: queueItems } = await supabase
        .from('meta_tx_queue')
        .select('*')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1);

      if (!queueItems || queueItems.length === 0) {
        await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
        return;
      }

      item = JSON.stringify({ id: queueItems[0].id });
    }

    const payload = JSON.parse(item);
    const queueId = payload.id;

    // Fetch queue item from database
    const { data: row, error: fetchError } = await supabase
      .from('meta_tx_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (fetchError || !row) {
      console.error('Error fetching queue item:', fetchError);
      return;
    }

    // Skip if already processing or done
    if (row.status !== 'queued') {
      return;
    }

    // Mark as processing
    await supabase
      .from('meta_tx_queue')
      .update({ status: 'processing' })
      .eq('id', queueId);

    console.log(`🔄 Processing meta-tx ${queueId}:`, {
      to: row.to_address,
      amount: row.amount,
      cid: row.cid
    });

    // Build message hash (must match TipRouter.sol)
    // TipRouter uses: keccak256(abi.encodePacked(from, to, amount, cidHash, nonce))
    const fromAddress = row.user_id; // In production, map user_id to wallet address
    const toAddress = row.to_address;
    const amount = ethers.parseUnits(String(row.amount || 0), 18);
    const cidHash = row.cid ? ethers.id(row.cid) : ethers.ZeroHash; // Convert CID string to bytes32
    const nonce = BigInt(row.nonce || 0);

    // Pre-check fairness rules (saves gas on failed submissions)
    // Note: This only works if TipRouterFair is deployed. For TipRouter, skip this check.
    if (tipRouterAddress) {
      try {
        const fairnessCheck = await canSubmitTip(provider, tipRouterAddress, fromAddress, toAddress, amount);
        if (!fairnessCheck.ok) {
          console.warn(`⚠️  Tip rejected by fairness check: ${fairnessCheck.reason}`, fairnessCheck.details);
          await supabase
            .from('meta_tx_queue')
            .update({ 
              status: 'failed',
              payload: { 
                ...row?.payload, 
                error: `Fairness check failed: ${fairnessCheck.reason}`,
                fairnessDetails: fairnessCheck.details
              }
            })
            .eq('id', queueId);
          return;
        }
        console.log('✅ Fairness check passed');
      } catch (fairnessErr) {
        // If fairness check fails (e.g., contract not TipRouterFair), continue anyway
        // The on-chain contract will enforce its own rules
        console.warn('⚠️  Fairness check error (non-critical, continuing):', fairnessErr);
      }
    }

    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'address', 'uint256', 'bytes32', 'uint256'],
        [fromAddress, toAddress, amount, cidHash, nonce]
      )
    );

    // EIP-191 prefix
    const ethSignedHash = ethers.keccak256(
      ethers.solidityPacked(
        ['string', 'bytes32'],
        ['\x19Ethereum Signed Message:\n32', messageHash]
      )
    );

    // Sign with KMS or local key
    let sig: ethers.Signature;
    if (kmsClient && process.env.KMS_KEY_ID) {
      try {
        const signatureHex = await signWithKmsDigest(messageHash);
        sig = ethers.Signature.from(signatureHex);
      } catch (kmsErr) {
        console.error('KMS signing failed, falling back to local key:', kmsErr);
        sig = await signWithLocalKey(messageHash);
      }
    } else {
      sig = await signWithLocalKey(messageHash);
    }

    // Submit transaction to contract
    if (!tipRouter || !tipRouterAddress) {
      console.warn('⚠️  TipRouter contract not configured, skipping submission');
      await supabase
        .from('meta_tx_queue')
        .update({ status: 'failed', tx_hash: null })
        .eq('id', queueId);
      return;
    }

    if (!relayerSigner) {
      throw new Error('Relayer signer not initialized');
    }

    const contractWithSigner = tipRouter.connect(relayerSigner);

    console.log('📤 Submitting to TipRouter:', {
      from: fromAddress,
      to: toAddress,
      amount: amount.toString(),
      cidHash,
      nonce: nonce.toString()
    });

    const tx = await contractWithSigner.submitTip(
      fromAddress,
      toAddress,
      amount,
      cidHash,
      nonce,
      sig.v,
      sig.r,
      sig.s,
      { gasLimit: 200000 }
    );

    console.log('⏳ Transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait(1);
    console.log('✅ Transaction confirmed:', receipt.hash);

    // Update queue status
    await supabase
      .from('meta_tx_queue')
      .update({ 
        status: 'submitted', 
        tx_hash: receipt.hash 
      })
      .eq('id', queueId);

    // Update tips ledger if tip_id exists
    if (row.tip_id) {
      await supabase
        .from('tips')
        .update({ 
          status: 'submitted',
          relayer_tx_hash: receipt.hash 
        })
        .eq('id', row.tip_id);
    }

    // Insert into tips ledger for audit
    await supabase.from('tips').insert({
      from_user: row.user_id,
      to_user: row.to_address, // In production, map to user_id
      amount: row.amount,
      cid: row.cid,
      relayer_tx_hash: receipt.hash,
      status: 'submitted',
      chain_network: 'very-testnet'
    }).catch(err => {
      console.warn('Error inserting tip ledger (non-critical):', err);
    });

  } catch (err: any) {
    console.error('❌ Relayer error:', err);
    
    // Mark as failed
    if (payload?.id) {
      await supabase
        .from('meta_tx_queue')
        .update({ 
          status: 'failed',
          payload: { 
            ...row?.payload, 
            error: err.message 
          }
        })
        .eq('id', payload.id);
    }
  }
}

/**
 * Main worker loop
 */
async function run() {
  console.log('🚀 Relayer worker starting...');
  console.log('📡 RPC URL:', rpcUrl);
  console.log('📝 TipRouter:', tipRouterAddress || '(not configured)');
  console.log('🔐 KMS:', process.env.KMS_KEY_ID ? 'enabled' : 'disabled (using local key)');
  console.log('💼 Relayer wallet:', relayerSigner?.address);

  while (true) {
    try {
      await processOne();
    } catch (err) {
      console.error('Fatal error in worker loop:', err);
      await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds before retry
    }
  }
}

// Start worker
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { run, processOne, signWithKmsDigest, signWithLocalKey };

