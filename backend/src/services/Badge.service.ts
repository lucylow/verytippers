import { BadgeRepository } from '../repositories/Badge.repository';
import { UserBadgeRepository } from '../repositories/UserBadge.repository';
import { VeryChainService } from './blockchain/VeryChain.service';
import { UserRepository } from '../repositories/User.repository';

export class BadgeService {
  private badgeRepo: BadgeRepository;
  private userBadgeRepo: UserBadgeRepository;
  private userRepo: UserRepository;
  private veryChain: VeryChainService;

  constructor() {
    this.badgeRepo = new BadgeRepository();
    this.userBadgeRepo = new UserBadgeRepository();
    this.userRepo = new UserRepository();
    this.veryChain = new VeryChainService();
  }

  async initializeDefaultBadges(): Promise<void> {
    const defaultBadges = [
      {
        name: 'First Tip',
        description: 'Sent your first tip',
        imageUrl: 'ipfs://Qm.../first-tip.png',
        requirements: { minTipsSent: 1 },
        isCommunityFunded: false
      },
      {
        name: 'Generous Soul',
        description: 'Sent 10+ tips',
        imageUrl: 'ipfs://Qm.../generous.png',
        requirements: { minTipsSent: 10 },
        isCommunityFunded: false
      },
      {
        name: 'Community Pillar',
        description: 'Tipped 50+ unique users',
        imageUrl: 'ipfs://Qm.../pillar.png',
        requirements: { minUniqueUsers: 50 },
        isCommunityFunded: true,
        poolBalance: '0'
      },
      {
        name: 'Streak Master',
        description: '7-day tipping streak',
        imageUrl: 'ipfs://Qm.../streak.png',
        requirements: { minStreakDays: 7 },
        isCommunityFunded: false
      },
      {
        name: 'Top Tipper',
        description: 'Top 10 weekly tipper',
        imageUrl: 'ipfs://Qm.../top-tipper.png',
        requirements: {}, // Special badge, awarded by admin
        isCommunityFunded: true,
        poolBalance: '0'
      }
    ];

    for (const badgeData of defaultBadges) {
      const existing = await this.badgeRepo.findByName(badgeData.name);
      if (!existing) {
        await this.badgeRepo.create(badgeData);
      }
    }

    console.log('✅ Default badges initialized');
  }

  async checkAndAwardBadges(userId: string): Promise<string[]> {
    const user = await this.userRepo.findByVerychatId(userId);
    if (!user) return [];

    const badges = await this.badgeRepo.findAll();
    const awardedBadges: string[] = [];

    for (const badge of badges) {
      // Check if user already has this badge
      const hasBadge = await this.userBadgeRepo.hasBadge(userId, badge.id);
      if (hasBadge) continue;

      // Check requirements
      const qualifies = await this.checkRequirements(user, badge);
      if (qualifies) {
        // Award badge
        await this.awardBadge(userId, badge);
        awardedBadges.push(badge.name);
      }
    }

    return awardedBadges;
  }

  private async checkRequirements(user: any, badge: any): Promise<boolean> {
    const req = badge.requirements;

    if (req.minTipsSent && user.totalTipsSent < req.minTipsSent) {
      return false;
    }

    if (req.minTipsReceived && user.totalTipsReceived < req.minTipsReceived) {
      return false;
    }

    if (req.minUniqueUsers && user.uniqueUsersTipped < req.minUniqueUsers) {
      return false;
    }

    if (req.minStreakDays && user.tipStreak < req.minStreakDays) {
      return false;
    }

    if (req.minCommunityContribution) {
      const contribution = await this.getCommunityContribution(user.id);
      if (contribution < req.minCommunityContribution) {
        return false;
      }
    }

    return true;
  }

  private async awardBadge(userId: string, badge: any): Promise<void> {
    // Create database record
    await this.userBadgeRepo.create({
      userId,
      badgeId: badge.id,
      badgeName: badge.name,
      transactionHash: 'system-awarded', // For blockchain badges, this would be the mint transaction
      earnedAt: new Date()
    });

    // If badge is on-chain, mint NFT
    const user = await this.userRepo.findByVerychatId(userId);
    if (user?.walletAddress) {
      await this.veryChain.checkAndAwardBadges(user.walletAddress);
    }

    // Send notification
    await this.sendBadgeNotification(userId, badge);
  }

  private async sendBadgeNotification(userId: string, badge: any): Promise<void> {
    // Implementation depends on notification service
    console.log(`🎖️ Badge awarded to ${userId}: ${badge.name}`);
  }

  async getUserBadges(userId: string): Promise<any[]> {
    return this.userBadgeRepo.findByUserId(userId);
  }

  async contributeToBadgePool(badgeId: string, amount: string, contributorId: string): Promise<void> {
    const badge = await this.badgeRepo.findById(badgeId);
    if (!badge) throw new Error('Badge not found');

    // Update pool balance
    const newBalance = (parseFloat(badge.poolBalance) + parseFloat(amount)).toString();
    await this.badgeRepo.updatePoolBalance(badgeId, newBalance);

    // Record contribution
    await this.badgeRepo.recordContribution(badgeId, contributorId, amount);
  }

  private async getCommunityContribution(userId: string): Promise<number> {
    // This would calculate community contribution based on various factors
    // For now, return 0
    return 0;
  }
}

