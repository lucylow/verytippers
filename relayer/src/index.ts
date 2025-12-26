/**
 * Dev Relayer Service for VeryTippers
 * 
 * WARNING: This relayer uses a local private key for demo/testnet only.
 * In production, use AWS KMS, Azure KeyVault, or HashiCorp Vault for signing.
 */

import express from 'express';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.verychain.org';
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const PORT = process.env.PORT || 8080;

if (!RELAYER_PRIVATE_KEY) {
  console.error('ERROR: RELAYER_PRIVATE_KEY not set in .env');
  console.error('For testnet demo, use a test account private key (NEVER use mainnet keys)');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

console.log('🔐 Relayer wallet address:', relayerWallet.address);
console.log('🌐 RPC URL:', RPC_URL);
console.log('📝 Contract address:', CONTRACT_ADDRESS || '(not set)');

// TipRouter ABI minimal snippet
const TIP_ROUTER_ABI = [
  "function submitTip(address from, address to, uint256 amount, bytes32 cidHash, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external",
  "event TipSubmitted(bytes32 indexed cidHash, address indexed from, address indexed to, uint256 amount, uint256 nonce)"
];

let tipRouter: ethers.Contract | null = null;

if (CONTRACT_ADDRESS) {
  tipRouter = new ethers.Contract(CONTRACT_ADDRESS, TIP_ROUTER_ABI, relayerWallet);
  console.log('✅ TipRouter contract initialized');
} else {
  console.warn('⚠️  CONTRACT_ADDRESS not set - relayer will return mock tx hashes');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    relayer: relayerWallet.address,
    network: RPC_URL,
    contract: CONTRACT_ADDRESS || 'not configured'
  });
});

// POST /submit-meta - Submit meta-transaction via relayer
app.post('/submit-meta', async (req, res) => {
  try {
    const { from, to, amount, cidHash, nonce, v, r, s } = req.body;

    // Validate required fields
    if (!from || !to || !amount || !cidHash || nonce === undefined) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: from, to, amount, cidHash, nonce' 
      });
    }

    // Build message hash (matches TipRouter.sol)
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

    // If v, r, s are provided, they're from user signature (for verification)
    // But contract expects relayer signature, so we sign with relayer key
    let relayerV: number;
    let relayerR: string;
    let relayerS: string;

    if (v !== undefined && r && s) {
      // Optional: Verify user signature matches 'from' address
      // This ensures the user authorized this tip
      const ethSignedHash = ethers.keccak256(
        ethers.solidityPacked(['string', 'bytes32'], ['\x19Ethereum Signed Message:\n32', messageHash])
      );
      const recoveredAddress = ethers.recoverAddress(ethSignedHash, { v, r, s });
      if (recoveredAddress.toLowerCase() !== ethers.getAddress(from).toLowerCase()) {
        return res.status(401).json({
          ok: false,
          error: 'User signature verification failed'
        });
      }
    }

    // Sign message hash with relayer key (contract expects this)
    const relayerSignature = await relayerWallet.signMessage(ethers.getBytes(messageHash));
    const relayerSig = ethers.Signature.from(relayerSignature);
    relayerV = relayerSig.v;
    relayerR = relayerSig.r;
    relayerS = relayerSig.s;

    // If contract is not configured, return mock response
    if (!tipRouter || !CONTRACT_ADDRESS) {
      console.log('📝 Mock submission (contract not configured):', { from, to, amount });
      const mockTxHash = ethers.keccak256(ethers.toUtf8Bytes(`${from}-${to}-${amount}-${Date.now()}`));
      return res.json({ 
        ok: true, 
        txHash: mockTxHash,
        mock: true,
        message: 'Contract not configured - returning mock tx hash'
      });
    }

    // Submit to contract with relayer signature
    console.log('📤 Submitting meta-tx:', { from, to, amount, cidHash, nonce });
    
    const tx = await tipRouter.submitTip(
      from,
      to,
      amount,
      cidHash,
      nonce,
      relayerV,
      relayerR,
      relayerS,
      { gasLimit: 200000 }
    );

    console.log('⏳ Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed:', receipt.transactionHash);

    res.json({ 
      ok: true, 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'confirmed' : 'failed'
    });
  } catch (err: any) {
    console.error('❌ Relayer error:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message || String(err),
      code: err.code
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Relayer running on http://localhost:${PORT}`);
  console.log(`📡 POST /submit-meta to submit meta-transactions`);
  console.log(`❤️  GET /health for health check`);
});

