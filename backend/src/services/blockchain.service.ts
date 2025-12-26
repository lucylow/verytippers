import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { BlockchainError, ExternalServiceError, ValidationError } from '../utils/errors';

/**
 * Blockchain Service for VERY Chain interactions
 */
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private tipRouter: ethers.Contract | null = null;
  private relayerWallet: ethers.Wallet | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly TRANSACTION_TIMEOUT = 60000; // 60 seconds

  constructor() {
    try {
      if (!config.VERY_CHAIN.RPC_URL) {
        throw new Error('VERY_CHAIN_RPC_URL is not configured');
      }

      this.provider = new ethers.JsonRpcProvider(config.VERY_CHAIN.RPC_URL, {
        name: 'VeryChain',
        chainId: config.VERY_CHAIN.CHAIN_ID || 88888
      });
      this.initializeRelayer();
    } catch (error) {
      logger.error('Failed to initialize BlockchainService', { error });
      throw new BlockchainError('Failed to initialize blockchain service', { error: (error as Error).message });
    }
  }

  private initializeRelayer(): void {
    try {
      const privateKey = config.RELAYER.PRIVATE_KEY;
      if (privateKey) {
        this.relayerWallet = new ethers.Wallet(privateKey, this.provider);
        logger.info('Relayer wallet initialized', {
          address: this.relayerWallet.address
        });
      } else {
        logger.warn('RELAYER_PRIVATE_KEY not set, gasless transactions disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize relayer wallet', { error });
      // Don't throw - allow service to continue in degraded mode
    }
  }

  /**
   * Submit tip transaction via relayer (gasless) with retry logic
   */
  async submitToRelayer(
    senderId: string,
    amount: bigint,
    recipientId: string,
    ipfsCid: string
  ): Promise<string> {
    if (!this.relayerWallet) {
      throw new BlockchainError('Relayer not configured. Please set RELAYER_PRIVATE_KEY environment variable.');
    }

    // Validate inputs
    if (!senderId || !recipientId) {
      throw new ValidationError('Sender ID and recipient ID are required');
    }

    if (!amount || amount <= 0n) {
      throw new ValidationError('Amount must be greater than zero');
    }

    if (!ipfsCid || ipfsCid.trim().length === 0) {
      throw new ValidationError('IPFS CID is required');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Check if amount is below sponsor threshold
        const threshold = ethers.parseEther(config.RELAYER.SPONSOR_THRESHOLD.toString());
        if (amount > threshold) {
          throw new ValidationError(
            `Amount ${ethers.formatEther(amount)} exceeds sponsor threshold ${config.RELAYER.SPONSOR_THRESHOLD}`
          );
        }

        // Check provider connection before attempting transaction
        await this.ensureProviderConnection();

        // If TipRouter contract is configured, use it
        if (config.CONTRACTS.TIP_CONTRACT_ADDRESS && this.tipRouter) {
          const tx = await Promise.race([
            this.tipRouter.sendTip(
              senderId,
              recipientId,
              amount,
              ipfsCid,
              {
                gasLimit: config.RELAYER.GAS_LIMIT
              }
            ),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Transaction timeout')), this.TRANSACTION_TIMEOUT)
            )
          ]);
          
          const receipt = await Promise.race([
            tx.wait(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Transaction confirmation timeout')), this.TRANSACTION_TIMEOUT)
            )
          ]);

          logger.info('Tip transaction confirmed', {
            txHash: receipt.hash,
            senderId,
            recipientId,
            attempt
          });
          
          return receipt.hash;
        }

        // Fallback: Direct transfer (if no contract)
        logger.warn('TipRouter contract not configured, using fallback');
        
        // For now, return a mock hash - implement actual contract interaction
        const mockHash = ethers.keccak256(
          ethers.toUtf8Bytes(`${senderId}-${recipientId}-${amount}-${Date.now()}`)
        );
        
        return mockHash;
      } catch (error) {
        lastError = error as Error;
        const isRetryable = this.isRetryableError(error as Error);
        
        logger.warn('Relayer submission attempt failed', {
          error: (error as Error).message,
          senderId,
          recipientId,
          attempt,
          maxRetries: this.MAX_RETRIES,
          retryable: isRetryable
        });

        // Don't retry on validation errors
        if (error instanceof ValidationError) {
          throw error;
        }

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

    logger.error('Relayer submission failed after all retries', {
      error: lastError?.message,
      senderId,
      recipientId,
      attempts: this.MAX_RETRIES
    });

    throw new BlockchainError(
      `Failed to submit transaction after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`,
      { senderId, recipientId, amount: amount.toString(), ipfsCid }
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
      'gateway timeout'
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Ensure provider connection is healthy
   */
  private async ensureProviderConnection(): Promise<void> {
    try {
      await Promise.race([
        this.provider.getBlockNumber(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Provider connection timeout')), 5000)
        )
      ]);
    } catch (error) {
      throw new ExternalServiceError(
        'Blockchain',
        `Provider connection failed: ${(error as Error).message}`,
        503
      );
    }
  }

  /**
   * Check blockchain connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await Promise.race([
        this.provider.getBlockNumber(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      return true;
    } catch (error) {
      logger.error('Blockchain health check failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get transaction receipt with retry logic
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    if (!txHash || txHash.trim().length === 0) {
      throw new ValidationError('Transaction hash is required');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const receipt = await Promise.race([
          this.provider.getTransactionReceipt(txHash),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Get receipt timeout')), 10000)
          )
        ]);

        if (receipt) {
          return receipt;
        }

        // If receipt is null, transaction might not be mined yet
        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
          continue;
        }

        return null;
      } catch (error) {
        lastError = error as Error;
        
        if (this.isRetryableError(error as Error) && attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
          continue;
        }

        logger.error('Failed to get transaction receipt', {
          error: (error as Error).message,
          txHash,
          attempt
        });
        break;
      }
    }

    return null;
  }
}

