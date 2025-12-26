/**
 * IPFS Integration with Encryption
 * 
 * For demo: Uses client-side encryption with a passphrase
 * Production: Use per-user symmetric keys stored/exchanged via orchestrator
 */

import { create } from 'ipfs-http-client';
import CryptoJS from 'crypto-js';

// IPFS client configuration
const ipfs = create({ 
  url: import.meta.env.VITE_IPFS_URL || 'https://ipfs.infura.io:5001/api/v0'
});

/**
 * Encrypts a message and uploads it to IPFS
 * @param message Plain text message to encrypt
 * @param passphrase Encryption passphrase (demo: use a default, production: per-user keys)
 * @returns IPFS CID string
 */
export async function addEncryptedMessage(
  message: string, 
  passphrase: string = 'verytippers-demo-key'
): Promise<string> {
  try {
    // Encrypt message using AES
    const encrypted = CryptoJS.AES.encrypt(message, passphrase).toString();
    
    // Upload to IPFS
    const { cid } = await ipfs.add(encrypted);
    return cid.toString();
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieves and decrypts a message from IPFS
 * @param cid IPFS CID string
 * @param passphrase Decryption passphrase (must match encryption passphrase)
 * @returns Decrypted plain text message
 */
export async function getDecryptedMessage(
  cid: string, 
  passphrase: string = 'verytippers-demo-key'
): Promise<string> {
  try {
    // Retrieve from IPFS
    const chunks: Uint8Array[] = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    
    // Combine chunks
    const encrypted = new TextDecoder().decode(
      new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
    );
    
    // Decrypt
    const bytes = CryptoJS.AES.decrypt(encrypted, passphrase);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Decryption failed - invalid passphrase or corrupted data');
    }
    
    return decrypted;
  } catch (error) {
    console.error('IPFS retrieval/decryption error:', error);
    throw new Error(`Failed to retrieve/decrypt from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Uploads raw data to IPFS (no encryption)
 * @param data Data to upload (string or Uint8Array)
 * @returns IPFS CID string
 */
export async function addToIPFS(data: string | Uint8Array): Promise<string> {
  try {
    const { cid } = await ipfs.add(data);
    return cid.toString();
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieves data from IPFS (no decryption)
 * @param cid IPFS CID string
 * @returns Raw data as string
 */
export async function getFromIPFS(cid: string): Promise<string> {
  try {
    const chunks: Uint8Array[] = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    
    const combined = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new TextDecoder().decode(combined);
  } catch (error) {
    console.error('IPFS retrieval error:', error);
    throw new Error(`Failed to retrieve from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

