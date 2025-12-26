import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import type { EncryptedPayload } from '../types';

/**
 * IPFS Service for pinning encrypted payloads
 */
export class IPFSService {
  private client: IPFSHTTPClient | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const ipfsConfig: any = {
        url: config.IPFS.API_URL || 'https://ipfs.infura.io:5001/api/v0'
      };

      // Add authentication if available
      if (config.IPFS.PROJECT_ID && config.IPFS.PROJECT_SECRET) {
        ipfsConfig.headers = {
          authorization: `Basic ${Buffer.from(
            `${config.IPFS.PROJECT_ID}:${config.IPFS.PROJECT_SECRET}`
          ).toString('base64')}`
        };
      }

      this.client = create(ipfsConfig);
      this.initialized = true;
      logger.info('IPFS service initialized', { url: ipfsConfig.url });
    } catch (error) {
      logger.error('IPFS initialization failed', { error });
      // Continue without IPFS in degraded mode
      this.initialized = false;
    }
  }

  /**
   * Pin encrypted payload to IPFS
   */
  async pinEncryptedPayload(payload: EncryptedPayload): Promise<string> {
    if (!this.client || !this.initialized) {
      throw new Error('IPFS service not available');
    }

    try {
      const payloadString = JSON.stringify(payload);
      const { cid } = await this.client.add(payloadString);
      
      // Pin the content
      await this.client.pin.add(cid);
      
      const cidString = cid.toString();
      logger.info('IPFS pin successful', { cid: cidString });
      
      return cidString;
    } catch (error) {
      logger.error('IPFS pin failed', { error });
      throw new Error('Failed to pin content to IPFS');
    }
  }

  /**
   * Retrieve and decrypt content from IPFS
   */
  async getEncryptedPayload(cid: string): Promise<EncryptedPayload> {
    if (!this.client || !this.initialized) {
      throw new Error('IPFS service not available');
    }

    try {
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }
      
      const data = Buffer.concat(chunks);
      const payload: EncryptedPayload = JSON.parse(data.toString());
      
      return payload;
    } catch (error) {
      logger.error('IPFS retrieval failed', { error, cid });
      throw new Error(`Failed to retrieve content from IPFS: ${cid}`);
    }
  }

  /**
   * Check IPFS service health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.initialized) {
      return false;
    }

    try {
      // Simple health check - try to get version
      await this.client.version();
      return true;
    } catch (error) {
      logger.warn('IPFS health check failed', { error });
      return false;
    }
  }
}

