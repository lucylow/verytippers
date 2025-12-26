import { ethers, BigNumberish, Contract } from 'ethers';
import { Web3ProviderFactory, VERY_CHAIN_CONFIG } from '../../config/web3';
import { config } from '../../config/app';
import { logger } from '../../utils/logger';
import { GasSponsorshipService } from './gasSponsorship.service';
import { PrismaService } from '../database/prisma.service';

export interface TipTransaction {
  from: string;
  to: string;
  token: string;
  amount: BigNumberish;
  messageHash: string;
  gasLimit?: BigNumberish;
  gasPrice?: BigNumberish;
  nonce?: number;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  tipId?: number;
  error?: string;
  sponsored: boolean;
  sponsoredGas?: bigint;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  allowance: bigint;
}

export class VeryChainService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private tipContract: Contract;
  private badgeContract: Contract;
  private gasSponsorship: GasSponsorshipService;
  private prisma: PrismaService;
  
  constructor() {
    this.provider = Web3ProviderFactory.getProvider();
    this.signer = Web3ProviderFactory.getSigner();
    this.tipContract = Web3ProviderFactory.getTipContract();
    this.badgeContract = Web3ProviderFactory.getBadgeContract();
    this.gasSponsorship = new GasSponsorshipService();
    this.prisma = PrismaService.getInstance();
  }
  
  async sendTip(
    tipData: TipTransaction,
    useGasSponsorship: boolean = false,
    userId?: string
  ): Promise<TransactionResult> {
    try {
      logger.info(`Processing tip: ${tipData.from} → ${tipData.to}`, {
        amount: tipData.amount.toString(),
        token: tipData.token
      });
      
      // Check token support
      const isSupported = await this.tipContract.supportedTokens(tipData.token);
      if (!isSupported) {
        throw new Error(`Token ${tipData.token} is not supported`);
      }
      
      // Check token balance
      const tokenContract = this.getTokenContract(tipData.token);
      const balance = await tokenContract.balanceOf(tipData.from);
      
      if (balance < BigInt(tipData.amount.toString())) {
        throw new Error('Insufficient token balance');
      }
      
      // Check allowance
      const allowance = await tokenContract.allowance(
        tipData.from,
        VERY_CHAIN_CONFIG.CONTRACTS.TIP
      );
      
      if (allowance < BigInt(tipData.amount.toString())) {
        throw new Error('Token allowance insufficient. Please approve first.');
      }
      
      let transactionResult: TransactionResult;
      
      if (useGasSponsorship && userId) {
        // Use gas sponsorship via relayer
        transactionResult = await this.sendSponsoredTip(tipData, userId);
      } else {
        // Regular transaction
        transactionResult = await this.sendRegularTip(tipData);
      }
      
      // Log transaction in database
      if (transactionResult.success && transactionResult.transactionHash) {
        await this.logTransaction(tipData, transactionResult, userId);
      }
      
      return transactionResult;
      
    } catch (error: any) {
      logger.error('Tip transaction failed:', error);
      
      return {
        success: false,
        error: error.message || 'Transaction failed',
        sponsored: false
      };
    }
  }
  
  async sendRegularTip(tipData: TipTransaction): Promise<TransactionResult> {
    const startTime = Date.now();
    
    try {
      // Get gas price with priority
      const gasPrice = await this.getGasPriceWithPriority();
      
      // Estimate gas
      const estimatedGas = await this.tipContract.tip.estimateGas(
        tipData.to,
        tipData.token,
        tipData.amount,
        tipData.messageHash
      );
      
      const gasLimit = (estimatedGas * BigInt(120)) / BigInt(100); // 20% buffer
      
      // Send transaction
      const tx = await this.tipContract.tip(
        tipData.to,
        tipData.token,
        tipData.amount,
        tipData.messageHash,
        {
          gasLimit,
          gasPrice,
          nonce: tipData.nonce || await this.getNonce(tipData.from)
        }
      );
      
      logger.info(`Transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait(VERY_CHAIN_CONFIG.CONFIRMATION_BLOCKS);
      
      // Extract tip ID from event
      const tipEvent = receipt.logs?.find((log: any) => {
        try {
          const parsed = this.tipContract.interface.parseLog(log);
          return parsed?.name === 'TipSent';
        } catch {
          return false;
        }
      });
      
      const tipId = tipEvent ? Number(this.tipContract.interface.parseLog(tipEvent).args.tipId) : undefined;
      
      const processingTime = Date.now() - startTime;
      logger.info(`Transaction confirmed in ${processingTime}ms`, {
        hash: tx.hash,
        block: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        tipId,
        sponsored: false
      };
      
    } catch (error: any) {
      throw new Error(`Regular tip failed: ${error.message}`);
    }
  }
  
  async sendSponsoredTip(
    tipData: TipTransaction,
    userId: string
  ): Promise<TransactionResult> {
    // For now, return a placeholder - relayer service would handle this
    // In production, this would call the relayer service
    logger.info('Sponsored tip requested', { userId, from: tipData.from });
    
    return {
      success: false,
      error: 'Gas sponsorship not fully implemented',
      sponsored: true
    };
  }
  
  async getTokenInfo(userAddress: string, tokenAddress: string): Promise<TokenInfo> {
    const tokenContract = this.getTokenContract(tokenAddress);
    
    const [symbol, name, decimals, balance, allowance] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.name(),
      tokenContract.decimals(),
      tokenContract.balanceOf(userAddress),
      tokenContract.allowance(userAddress, VERY_CHAIN_CONFIG.CONTRACTS.TIP)
    ]);
    
    return {
      address: tokenAddress,
      symbol,
      name,
      decimals: Number(decimals),
      balance: BigInt(balance.toString()),
      allowance: BigInt(allowance.toString())
    };
  }
  
  async getGasPriceWithPriority(): Promise<bigint> {
    const gasPrice = await this.provider.getFeeData();
    const baseFee = gasPrice.gasPrice || BigInt(0);
    return (baseFee * BigInt(110)) / BigInt(100); // 10% priority
  }
  
  async getNonce(address: string): Promise<number> {
    return await this.provider.getTransactionCount(address, 'pending');
  }
  
  private getTokenContract(tokenAddress: string): Contract {
    return new ethers.Contract(
      tokenAddress,
      [
        'function balanceOf(address) view returns (uint256)',
        'function allowance(address, address) view returns (uint256)',
        'function approve(address, uint256) returns (bool)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)'
      ],
      this.provider
    );
  }
  
  private async logTransaction(
    tipData: TipTransaction,
    result: TransactionResult,
    userId?: string
  ): Promise<void> {
    try {
      // Find users by wallet address
      const [sender, recipient] = await Promise.all([
        this.prisma.prisma.user.findUnique({ where: { walletAddress: tipData.from } }),
        this.prisma.prisma.user.findUnique({ where: { walletAddress: tipData.to } })
      ]);
      
      if (sender && recipient) {
        await this.prisma.prisma.tip.create({
          data: {
            senderId: sender.id,
            recipientId: recipient.id,
            tokenAddress: tipData.token,
            amount: tipData.amount.toString(),
            amountInWei: BigInt(tipData.amount.toString()),
            messageHash: tipData.messageHash,
            transactionHash: result.transactionHash!,
            blockNumber: result.blockNumber,
            tipId: result.tipId,
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            aiFeatures: {
              sponsored: result.sponsored,
              gasUsed: result.gasUsed?.toString(),
              sponsoredGas: result.sponsoredGas?.toString()
            }
          }
        });
        
        // Update user stats
        await this.updateUserStats(sender.id, recipient.id);
        
        logger.info('Transaction logged to database');
      }
      
    } catch (error) {
      logger.error('Failed to log transaction:', error);
    }
  }
  
  private async updateUserStats(senderId: string, recipientId: string): Promise<void> {
    try {
      await Promise.all([
        this.prisma.prisma.user.update({
          where: { id: senderId },
          data: {
            totalTipsSent: { increment: 1 },
            lastTipAt: new Date()
          }
        }),
        this.prisma.prisma.user.update({
          where: { id: recipientId },
          data: {
            totalTipsReceived: { increment: 1 }
          }
        })
      ]);
    } catch (error) {
      logger.error('Failed to update user stats:', error);
    }
  }
}

