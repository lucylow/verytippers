#!/usr/bin/env node
/**
 * Demo Sign Script
 * 
 * Simulates wallet signing for development/testing
 * Uses local Hardhat account to sign message hash
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '../.env') });

const RPC_URL = process.env.RPC_URL_TESTNET || 'http://localhost:8545';
const PRIVATE_KEY = process.env.DEMO_USER_PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Hardhat account #1

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.error('Usage: node scripts/demo-sign.js <messageHash>');
        console.error('Example: node scripts/demo-sign.js 0x1234...');
        process.exit(1);
    }

    const messageHash = args[0];
    
    if (!ethers.isHexString(messageHash, 32)) {
        console.error('Error: messageHash must be a 32-byte hex string (0x...)');
        process.exit(1);
    }

    console.log('🔐 Signing message hash...');
    console.log(`  Message Hash: ${messageHash}`);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`  Signer: ${wallet.address}`);

    // Sign the message hash (EIP-191 personal_sign)
    const messageBytes = ethers.getBytes(messageHash);
    const signature = await wallet.signMessage(messageBytes);
    const sig = ethers.Signature.from(signature);

    console.log('\n✅ Signature generated:');
    console.log(JSON.stringify({
        signature,
        v: sig.v,
        r: sig.r,
        s: sig.s,
        signer: wallet.address
    }, null, 2));
}

main().catch((error) => {
    console.error('❌ Signing failed:', error);
    process.exit(1);
});

