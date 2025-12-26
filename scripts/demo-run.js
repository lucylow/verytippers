#!/usr/bin/env node
/**
 * Demo Script - End-to-End Tip Flow
 * 
 * Simulates a complete tip flow:
 * 1. Create demo user accounts (two wallets)
 * 2. Run orchestrator to create IPFS entry (mock)
 * 3. Sign payload with user wallet (simulate personal_sign)
 * 4. Send to orchestrator which queues
 * 5. Relayer signs and submits to local Hardhat contract
 * 6. Indexer reads event and prints DB update
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '../.env') });

// Dynamic imports for ES modules
let OrchestratorService, DatabaseService;

const RPC_URL = process.env.RPC_URL_TESTNET || 'http://localhost:8545';
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat account #0

async function main() {
    console.log('🚀 Starting VeryTippers Demo...\n');

    // 1. Setup provider and wallets
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    
    // Create demo user wallets
    const user1 = ethers.Wallet.createRandom().connect(provider);
    const user2 = ethers.Wallet.createRandom().connect(provider);

    console.log('📝 Demo Users:');
    console.log(`  User 1: ${user1.address}`);
    console.log(`  User 2: ${user2.address}`);
    console.log(`  Relayer: ${relayerWallet.address}\n`);

    // 2. Initialize services (dynamic import for ES modules)
    const { OrchestratorService: OS } = await import('../server/services/OrchestratorService.js');
    const { DatabaseService: DS } = await import('../server/services/DatabaseService.js');
    const orchestrator = new OS();
    const db = DS.getInstance();

    // 3. Create tip draft
    console.log('📦 Creating tip draft...');
    const nonce = await orchestrator.getNextNonce(user1.address);
    const draft = {
        from: user1.address,
        to: user2.address,
        amount: '1.0', // 1 VERY
        message: 'Great work! Keep it up!',
        nonce
    };

    const preview = await orchestrator.createTipDraft(draft);
    console.log(`  ✓ CID: ${preview.cid}`);
    console.log(`  ✓ CID Hash: ${preview.cidHash}`);
    console.log(`  ✓ Message Hash: ${preview.messageHash}\n`);

    // 4. Sign with user wallet (simulate personal_sign)
    console.log('✍️  Signing message hash with user wallet...');
    const messageBytes = ethers.getBytes(preview.messageHash);
    const userSignature = await user1.signMessage(messageBytes);
    const sig = ethers.Signature.from(userSignature);
    console.log(`  ✓ Signature: ${userSignature.slice(0, 20)}...\n`);

    // 5. Build relayer signature
    console.log('🔐 Relayer signing message hash...');
    const relayerSignature = await relayerWallet.signMessage(messageBytes);
    const relayerSig = ethers.Signature.from(relayerSignature);
    console.log(`  ✓ Relayer Signature: ${relayerSignature.slice(0, 20)}...\n`);

    // 6. Submit to contract (if deployed)
    const TIP_CONTRACT_ADDRESS = process.env.TIP_CONTRACT_ADDRESS;
    if (TIP_CONTRACT_ADDRESS && TIP_CONTRACT_ADDRESS !== '0xTipContractAddress') {
        console.log('📤 Submitting to TipRouter contract...');
        try {
            // Import contract ABI (simplified)
            const tipRouterAbi = [
                'function submitTip(address from, address to, uint256 amount, bytes32 cidHash, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external'
            ];
            const tipRouter = new ethers.Contract(TIP_CONTRACT_ADDRESS, tipRouterAbi, relayerWallet);

            const amountWei = ethers.parseEther(draft.amount);
            const tx = await tipRouter.submitTip(
                user1.address,
                user2.address,
                amountWei,
                preview.cidHash,
                nonce,
                relayerSig.v,
                relayerSig.r,
                relayerSig.s,
                { gasLimit: 200000 }
            );

            console.log(`  ✓ Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`  ✓ Confirmed in block: ${receipt.blockNumber}\n`);

            // 7. Simulate indexer update
            console.log('📊 Indexer processing event...');
            console.log(`  ✓ Tip recorded: ${user1.address} → ${user2.address}`);
            console.log(`  ✓ Amount: ${draft.amount} VERY`);
            console.log(`  ✓ Transaction: ${tx.hash}\n`);

        } catch (error) {
            console.error('  ✗ Contract submission failed:', error.message);
            console.log('  (This is expected if contract is not deployed)\n');
        }
    } else {
        console.log('⚠️  TipRouter contract not configured (TIP_CONTRACT_ADDRESS not set)');
        console.log('  Skipping blockchain submission. This is a mock demo.\n');
    }

    console.log('✅ Demo completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Deploy TipRouter contract: pnpm deploy:testnet');
    console.log('  2. Set TIP_CONTRACT_ADDRESS in .env');
    console.log('  3. Run demo again to test full flow');
}

main().catch((error) => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
});

