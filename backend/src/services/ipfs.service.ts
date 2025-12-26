import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { ExternalServiceError, ValidationError } from '../utils/errors';
import type { EncryptedPayload } from '../types';

/**
 * IPFS Service for pinning encrypted payloads
 */
export class IPFSService {
  private client: IPFSHTTPClient | null = null;
  private initialized = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly OPERATION_TIMEOUT = 30000; // 30 seconds

  constructor() {
    this.initialize().catch((error) => {
      logger.error('IPFS initialization failed', { error });
      // Continue without IPFS in degraded mode
      this.initialized = false;
    });
  }

  private async initialize(): Promise<void> {
    try {
      const ipfsConfig: any = {
        url: config.IPFS.API_URL || 'https://ipfs.infura.io:5001/api/v0',
        timeout: this.OPERATION_TIMEOUT
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
      
      // Verify connection with a health check
      try {
        await Promise.race([
          this.client.version(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('IPFS connection timeout')), 5000)
          )
        ]);
        this.initialized = true;
        logger.info('IPFS service initialized', { url: ipfsConfig.url });
      } catch (healthError) {
        logger.warn('IPFS health check failed during initialization', { error: healthError });
        this.initialized = false;
      }
    } catch (error) {
      logger.error('IPFS initialization failed', { error });
      // Continue without IPFS in degraded mode
      this.initialized = false;
    }
  }

  /**
   * Pin encrypted payload to IPFS with retry logic
   */
  async pinEncryptedPayload(payload: EncryptedPayload): Promise<string> {
    if (!this.client || !this.initialized) {
      throw new ExternalServiceError(
        'IPFS',
        'IPFS service not available. Please check IPFS configuration.',
        503
      );
    }

    if (!payload) {
      throw new ValidationError('Payload is required');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const payloadString = JSON.stringify(payload);
        
        // Add payload with timeout
        const addResult = await Promise.race([
          this.client.add(payloadString),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('IPFS add operation timeout')), this.OPERATION_TIMEOUT)
          )
        ]);
        
        const { cid } = addResult;
        
        // Pin the content with timeout
        await Promise.race([
          this.client.pin.add(cid),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('IPFS pin operation timeout')), this.OPERATION_TIMEOUT)
          )
        ]);
        
        const cidString = cid.toString();
        logger.info('IPFS pin successful', { cid: cidString, attempt });
        
        return cidString;
      } catch (error) {
        lastError = error as Error;
        const isRetryable = this.isRetryableError(error as Error);
        
        logger.warn('IPFS pin attempt failed', {
          error: (error as Error).message,
          attempt,
          maxRetries: this.MAX_RETRIES,
          retryable: isRetryable
        });

        // Retry on retryable errors
        if (isRetryable && attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY * attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // If not retryable or max retries reached, throw
        break;
      }
    }

    logger.error('IPFS pin failed after all retries', {
      error: lastError?.message,
      attempts: this.MAX_RETRIES
    });

    throw new ExternalServiceError(
      'IPFS',
      `Failed to pin content to IPFS after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`,
      503
    );
  }

  /**
   * Retrieve and decrypt content from IPFS with retry logic
   */
  async getEncryptedPayload(cid: string): Promise<EncryptedPayload> {
    if (!this.client || !this.initialized) {
      throw new ExternalServiceError(
        'IPFS',
        'IPFS service not available. Please check IPFS configuration.',
        503
      );
    }

    if (!cid || cid.trim().length === 0) {
      throw new ValidationError('CID is required');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const chunks: Uint8Array[] = [];
        const catStream = this.client.cat(cid);
        
        // Read chunks with timeout
        const readPromise = (async () => {
          for await (const chunk of catStream) {
            chunks.push(chunk);
          }
        })();

        await Promise.race([
          readPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('IPFS retrieval timeout')), this.OPERATION_TIMEOUT)
          )
        ]);
        
        const data = Buffer.concat(chunks);
        
        if (data.length === 0) {
          throw new Error('Empty content retrieved from IPFS');
        }

        let payload: EncryptedPayload;
        try {
          payload = JSON.parse(data.toString());
        } catch (parseError) {
          throw new Error(`Failed to parse IPFS content: ${(parseError as Error).message}`);
        }
        
        return payload;
      } catch (error) {
        lastError = error as Error;
        const isRetryable = this.isRetryableError(error as Error);
        
        logger.warn('IPFS retrieval attempt failed', {
          error: (error as Error).message,
          cid,
          attempt,
          maxRetries: this.MAX_RETRIES,
          retryable: isRetryable
        });

        // Retry on retryable errors
        if (isRetryable && attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY * attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // If not retryable or max retries reached, throw
        break;
      }
    }

    logger.error('IPFS retrieval failed after all retries', {
      error: lastError?.message,
      cid,
      attempts: this.MAX_RETRIES
    });

    throw new ExternalServiceError(
      'IPFS',
      `Failed to retrieve content from IPFS (${cid}) after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`,
      503
    );
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'network',
      'timeout',
      'connection',
      'econnrefused',
      'etimedout',
      'eai_again',
      'rate limit',
      'too many requests',
      'service unavailable',
      'bad gateway',
      'gateway timeout',
      'econnreset'
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Check IPFS service health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.initialized) {
      return false;
    }

    try {
      // Simple health check - try to get version with timeout
      await Promise.race([
        this.client.version(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      return true;
    } catch (error) {
      logger.warn('IPFS health check failed', { error: (error as Error).message });
      return false;
    }
  }
}

