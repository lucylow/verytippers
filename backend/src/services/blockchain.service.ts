import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { config } from '../config/config';

/**
 * Blockchain Service for VERY Chain interactions
 */
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private tipRouter: ethers.Contract | null = null;
  private relayerWallet: ethers.Wallet | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.VERY_CHAIN.RPC_URL);
    this.initializeRelayer();
  }

  private initializeRelayer(): void {
    const privateKey = config.RELAYER.PRIVATE_KEY;
    if (privateKey) {
      this.relayerWallet = new ethers.Wallet(privateKey, this.provider);
      logger.info('Relayer wallet initialized', {
        address: this.relayerWallet.address
      });
    } else {
      logger.warn('RELAYER_PRIVATE_KEY not set, gasless transactions disabled');
    }
  }

  /**
   * Submit tip transaction via relayer (gasless)
   */
  async submitToRelayer(
    senderId: string,
    amount: bigint,
    recipientId: string,
    ipfsCid: string
  ): Promise<string> {
    if (!this.relayerWallet) {
      throw new Error('Relayer not configured');
    }

    try {
      // Check if amount is below sponsor threshold
      const threshold = ethers.parseEther(config.RELAYER.SPONSOR_THRESHOLD.toString());
      if (amount > threshold) {
        throw new Error(`Amount ${ethers.formatEther(amount)} exceeds sponsor threshold ${config.RELAYER.SPONSOR_THRESHOLD}`);
      }

      // If TipRouter contract is configured, use it
      if (config.CONTRACTS.TIP_CONTRACT_ADDRESS && this.tipRouter) {
        const tx = await this.tipRouter.sendTip(
          senderId,
          recipientId,
          amount,
          ipfsCid,
          {
            gasLimit: config.RELAYER.GAS_LIMIT
          }
        );
        
        const receipt = await tx.wait();
        logger.info('Tip transaction confirmed', {
          txHash: receipt.hash,
          senderId,
          recipientId
        });
        
        return receipt.hash;
      }

      // Fallback: Direct transfer (if no contract)
      // Note: This is a simplified version - in production, use a proper tip router contract
      logger.warn('TipRouter contract not configured, using fallback');
      
      // For now, return a mock hash - implement actual contract interaction
      const mockHash = ethers.keccak256(
        ethers.toUtf8Bytes(`${senderId}-${recipientId}-${amount}-${Date.now()}`)
      );
      
      return mockHash;
    } catch (error) {
      logger.error('Relayer submission failed', { error, senderId, recipientId });
      throw error;
    }
  }

  /**
   * Check blockchain connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      logger.error('Blockchain health check failed', { error });
      return false;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      logger.error('Failed to get transaction receipt', { error, txHash });
      return null;
    }
  }
}

