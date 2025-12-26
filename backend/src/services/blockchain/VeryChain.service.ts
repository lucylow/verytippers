import { ethers, Contract, Wallet, JsonRpcProvider } from 'ethers';
import { config } from '../../config/config';
import TipABI from '../../contracts/abis/Tip.json';
import BadgeABI from '../../contracts/abis/BadgeFactory.json';

export class VeryChainService {
  private provider: JsonRpcProvider;
  private tipContract: Contract | null = null;
  private badgeContract: Contract | null = null;
  private relayerWallet: Wallet | null = null;

  constructor() {
    this.provider = new JsonRpcProvider(config.VERY_CHAIN.RPC_URL);
    
    if (config.RELAYER.PRIVATE_KEY) {
      this.relayerWallet = new Wallet(config.RELAYER.PRIVATE_KEY, this.provider);
      
      if (config.CONTRACTS.TIP_CONTRACT_ADDRESS) {
        this.tipContract = new ethers.Contract(
          config.CONTRACTS.TIP_CONTRACT_ADDRESS,
          TipABI as any,
          this.relayerWallet
        );
      }

      if (config.CONTRACTS.BADGE_CONTRACT_ADDRESS) {
        this.badgeContract = new ethers.Contract(
          config.CONTRACTS.BADGE_CONTRACT_ADDRESS,
          BadgeABI as any,
          this.relayerWallet
        );
      }
    }
  }

  async sendTip(
    fromAddress: string,
    toAddress: string,
    tokenAddress: string,
    amount: string,
    messageHash: string = ''
  ): Promise<{ txHash: string; tipId: number }> {
    if (!this.tipContract || !this.relayerWallet) {
      throw new Error('Tip contract or relayer wallet not configured');
    }

    try {
      // Check if token is supported
      const isSupported = await this.tipContract.supportedTokens(tokenAddress);
      if (!isSupported) {
        throw new Error(`Token ${tokenAddress} is not supported`);
      }

      // Prepare transaction data
      const txData = this.tipContract.interface.encodeFunctionData('tip', [
        toAddress,
        tokenAddress,
        amount,
        messageHash
      ]);

      // Calculate gas
      const gasEstimate = await this.tipContract.tip.estimateGas(
        toAddress,
        tokenAddress,
        amount,
        messageHash,
        { from: fromAddress }
      );

      // Send transaction via relayer (gas sponsorship)
      const tx = await this.relayerWallet.sendTransaction({
        to: this.tipContract.target as string,
        data: txData,
        gasLimit: (gasEstimate * BigInt(12)) / BigInt(10), // 20% buffer
        chainId: config.VERY_CHAIN.CHAIN_ID
      });

      // Wait for confirmation
      const receipt = await tx.wait();
      
      // Parse events to get tipId
      let tipId = -1;
      if (receipt && receipt.logs) {
        const tipEvent = receipt.logs
          .map((log: any) => {
            try {
              return this.tipContract!.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((event: any) => event?.name === 'TipSent' && event.args.from === fromAddress);

        if (tipEvent) {
          tipId = Number(tipEvent.args.tipId);
        }
      }

      return {
        txHash: tx.hash,
        tipId
      };
    } catch (error) {
      console.error('Error sending tip:', error);
      throw error;
    }
  }

  async getTokenBalance(address: string, tokenAddress: string): Promise<string> {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address) view returns (uint256)'],
      this.provider
    );
    
    const balance = await tokenContract.balanceOf(address);
    return balance.toString();
  }

  async checkAndAwardBadges(userAddress: string): Promise<string[]> {
    if (!this.badgeContract || !this.tipContract) {
      console.warn('Badge or tip contract not configured');
      return [];
    }

    const badgeIds: string[] = [];
    
    try {
      // Get user stats from contract
      const [totalSent, totalReceived] = await Promise.all([
        this.tipContract.totalTipsSent(userAddress),
        this.tipContract.totalTipsReceived(userAddress)
      ]);

      // Check each badge criteria
      if (Number(totalSent) > 0) {
        const hasFirstTipBadge = await this.badgeContract.hasBadge(userAddress, 0);
        if (!hasFirstTipBadge) {
          const tx = await this.badgeContract.mintBadge(userAddress, 0);
          await tx.wait();
          badgeIds.push('0');
        }
      }

      if (Number(totalSent) >= 10 * 1e18) {
        const hasGenerousBadge = await this.badgeContract.hasBadge(userAddress, 1);
        if (!hasGenerousBadge) {
          const tx = await this.badgeContract.mintBadge(userAddress, 1);
          await tx.wait();
          badgeIds.push('1');
        }
      }

      return badgeIds;
    } catch (error) {
      console.error('Error awarding badges:', error);
      return [];
    }
  }

  async getTipHistory(userAddress: string, limit: number = 10): Promise<any[]> {
    if (!this.tipContract) {
      return [];
    }

    try {
      const tipFilter = this.tipContract.filters.TipSent(userAddress);
      const events = await this.tipContract.queryFilter(tipFilter, -10000, 'latest');
      
      return events.slice(-limit).map(event => ({
        from: event.args.from,
        to: event.args.to,
        token: event.args.token,
        amount: event.args.amount.toString(),
        messageHash: event.args.messageHash,
        timestamp: new Date(Number(event.args.timestamp) * 1000),
        txHash: event.transactionHash
      }));
    } catch (error) {
      console.error('Error fetching tip history:', error);
      return [];
    }
  }
}

