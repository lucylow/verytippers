import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import type { EncryptedPayload } from '../types';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encryption Service for IPFS payloads
 */
export class EncryptionService {
  private encryptionKey: Buffer;

  constructor() {
    const keyString = config.SECURITY.ENCRYPTION_KEY;
    if (!keyString || keyString.length < 64) {
      throw new Error('ENCRYPTION_KEY must be at least 64 hex characters (32 bytes)');
    }
    
    // Ensure key is exactly 32 bytes
    if (keyString.length === 64) {
      this.encryptionKey = Buffer.from(keyString, 'hex');
    } else {
      // Hash shorter keys to 32 bytes
      this.encryptionKey = createHash('sha256').update(keyString).digest();
    }
  }

  /**
   * Encrypt a message payload
   */
  async encryptMessage(message: string): Promise<EncryptedPayload> {
    try {
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGO, this.encryptionKey, iv);
      
      let encrypted = cipher.update(message, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        iv: iv.toString('hex'),
        encrypted,
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed', { error, message: 'Message encryption error' });
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message payload
   */
  async decryptMessage(payload: EncryptedPayload): Promise<string> {
    try {
      const key = this.encryptionKey;
      const decipher = createDecipheriv(
        ALGO,
        key,
        Buffer.from(payload.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
      
      let decrypted = decipher.update(payload.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error, payload: { iv: payload.iv } });
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Validate encryption key format
   */
  static validateKey(key: string): boolean {
    if (!key) return false;
    // Accept hex strings (64 chars) or any string (will be hashed)
    return key.length >= 32;
  }
}

