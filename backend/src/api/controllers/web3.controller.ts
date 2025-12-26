import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { VeryChainService } from '../../services/web3/verychain.service';
import { GasSponsorshipService } from '../../services/web3/gasSponsorship.service';
import { config } from '../../config/app';
import { logger } from '../../utils/logger';
import { PrismaService } from '../../services/database/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class Web3Controller {
  private veryChain: VeryChainService;
  private gasSponsorship: GasSponsorshipService;
  private prisma: PrismaService;
  
  constructor() {
    this.veryChain = new VeryChainService();
    this.gasSponsorship = new GasSponsorshipService();
    this.prisma = PrismaService.getInstance();
  }
  
  async sendTip(req: AuthRequest, res: Response) {
    try {
      const {
        recipientAddress,
        tokenAddress,
        amount,
        message,
        useGasSponsorship = false
      } = req.body;
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }
      
      // Get user wallet
      const user = await this.prisma.prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user || !user.walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'User wallet not found'
        });
      }
      
      // Validate amount
      const tokenConfig = this.getTokenConfig(tokenAddress);
      if (!tokenConfig) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported token'
        });
      }
      
      const amountInWei = ethers.parseUnits(amount, tokenConfig.decimals);
      
      if (amountInWei < tokenConfig.minTipAmount) {
        return res.status(400).json({
          success: false,
          error: `Amount too small. Minimum: ${ethers.formatUnits(tokenConfig.minTipAmount, tokenConfig.decimals)}`
        });
      }
      
      if (amountInWei > tokenConfig.maxTipAmount) {
        return res.status(400).json({
          success: false,
          error: `Amount too large. Maximum: ${ethers.formatUnits(tokenConfig.maxTipAmount, tokenConfig.decimals)}`
        });
      }
      
      // Store message hash (in production, would encrypt and store on IPFS)
      const messageHash = message ? ethers.id(message) : '';
      
      // Prepare transaction
      const tipData = {
        from: user.walletAddress,
        to: recipientAddress,
        token: tokenAddress,
        amount: amountInWei,
        messageHash
      };
      
      // Send tip
      const result = await this.veryChain.sendTip(
        tipData,
        useGasSponsorship,
        userId
      );
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      
      res.json({
        success: true,
        data: {
          transactionHash: result.transactionHash,
          tipId: result.tipId,
          sponsored: result.sponsored,
          sponsoredGas: result.sponsoredGas?.toString(),
          explorerUrl: `${config.VERY_CHAIN_RPC}/tx/${result.transactionHash}`
        }
      });
      
    } catch (error: any) {
      logger.error('Send tip error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send tip'
      });
    }
  }
  
  async getTokenInfo(req: AuthRequest, res: Response) {
    try {
      const { tokenAddress } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }
      
      const user = await this.prisma.prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user || !user.walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'User wallet not found'
        });
      }
      
      const tokenInfo = await this.veryChain.getTokenInfo(user.walletAddress, tokenAddress);
      
      res.json({
        success: true,
        data: {
          ...tokenInfo,
          formattedBalance: ethers.formatUnits(tokenInfo.balance, tokenInfo.decimals),
          formattedAllowance: ethers.formatUnits(tokenInfo.allowance, tokenInfo.decimals)
        }
      });
      
    } catch (error: any) {
      logger.error('Get token info error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get token info'
      });
    }
  }
  
  async getGasSponsorshipInfo(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }
      
      const info = await this.gasSponsorship.getInfo(userId);
      
      res.json({
        success: true,
        data: info
      });
      
    } catch (error: any) {
      logger.error('Get gas sponsorship error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get gas sponsorship info'
      });
    }
  }
  
  private getTokenConfig(tokenAddress: string) {
    const tokenConfigs: Record<string, any> = {
      [config.VERY_TOKEN_ADDRESS]: {
        symbol: 'VERY',
        decimals: 18,
        minTipAmount: ethers.parseUnits('0.1', 18),
        maxTipAmount: ethers.parseUnits('1000', 18)
      },
      [config.USDC_TOKEN_ADDRESS]: {
        symbol: 'USDC',
        decimals: 6,
        minTipAmount: ethers.parseUnits('0.1', 6),
        maxTipAmount: ethers.parseUnits('1000', 6)
      }
    };
    
    return tokenConfigs[tokenAddress];
  }
}

