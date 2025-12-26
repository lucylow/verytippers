/**
 * Social Service
 * 
 * Handles social features: follows, activity feeds, notifications, mentions
 */

import { PrismaClient, ActivityType, NotificationType } from '@prisma/client';

export interface ActivityData {
  userId: string;
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  isPublic?: boolean;
}

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export class SocialService {
  private db: PrismaClient;

  constructor(db?: PrismaClient) {
    // Use provided PrismaClient or create a new one
    // In server context, we can pass DatabaseService.getInstance()
    // In backend context, we can use PrismaService
    if (db) {
      this.db = db;
    } else {
      // Try to import DatabaseService from server, or create new PrismaClient
      try {
        const { DatabaseService } = require('../../../server/services/DatabaseService');
        this.db = DatabaseService.getInstance();
      } catch {
        // Fallback: create new PrismaClient
        this.db = new PrismaClient();
      }
    }
  }

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<{ success: boolean; message: string }> {
    if (followerId === followingId) {
      return { success: false, message: 'Cannot follow yourself' };
    }

    try {
      // Check if already following
      const existing = await this.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      if (existing) {
        return { success: false, message: 'Already following this user' };
      }

      // Create follow relationship
      await this.db.follow.create({
        data: {
          followerId,
          followingId
        }
      });

      // Update follower counts
      await Promise.all([
        this.db.user.update({
          where: { id: followerId },
          data: { followingCount: { increment: 1 } }
        }),
        this.db.user.update({
          where: { id: followingId },
          data: { followersCount: { increment: 1 } }
        })
      ]);

      // Create activity
      await this.createActivity({
        userId: followerId,
        type: ActivityType.FOLLOWED,
        title: 'Started following',
        description: `Now following user`,
        metadata: { followingId },
        isPublic: true
      });

      // Create notification for the followed user
      const follower = await this.db.user.findUnique({ where: { id: followerId } });
      await this.createNotification({
        userId: followingId,
        type: NotificationType.NEW_FOLLOWER,
        title: 'New Follower',
        message: `${follower?.username || follower?.displayName || 'Someone'} started following you`,
        metadata: { followerId }
      });

      return { success: true, message: 'Successfully followed user' };
    } catch (error: any) {
      const { logger } = require('../../utils/logger');
      logger.error('Error following user', { error, userId, targetUserId });
      return { success: false, message: error.message || 'Failed to follow user' };
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<{ success: boolean; message: string }> {
    try {
      const follow = await this.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      if (!follow) {
        return { success: false, message: 'Not following this user' };
      }

      await this.db.follow.delete({
        where: { id: follow.id }
      });

      // Update follower counts
      await Promise.all([
        this.db.user.update({
          where: { id: followerId },
          data: { followingCount: { decrement: 1 } }
        }),
        this.db.user.update({
          where: { id: followingId },
          data: { followersCount: { decrement: 1 } }
        })
      ]);

      return { success: true, message: 'Successfully unfollowed user' };
    } catch (error: any) {
      const { logger } = require('../../utils/logger');
      logger.error('Error unfollowing user', { error, userId, targetUserId });
      return { success: false, message: error.message || 'Failed to unfollow user' };
    }
  }

  /**
   * Check if user A follows user B
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });
    return !!follow;
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string, limit: number = 50, offset: number = 0) {
    const follows = await this.db.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            isVerified: true,
            followersCount: true,
            followingCount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return {
      followers: follows.map(f => f.follower),
      total: await this.db.follow.count({ where: { followingId: userId } })
    };
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, limit: number = 50, offset: number = 0) {
    const follows = await this.db.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            isVerified: true,
            followersCount: true,
            followingCount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return {
      following: follows.map(f => f.following),
      total: await this.db.follow.count({ where: { followerId: userId } })
    };
  }

  /**
   * Create an activity
   */
  async createActivity(data: ActivityData) {
    return this.db.activity.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        metadata: data.metadata || {},
        isPublic: data.isPublic !== false
      }
    });
  }

  /**
   * Get activity feed for a user (from users they follow)
   */
  async getActivityFeed(userId: string, limit: number = 20, offset: number = 0) {
    // Get list of users being followed
    const following = await this.db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);
    followingIds.push(userId); // Include own activities

    // Get activities from followed users
    const activities = await this.db.activity.findMany({
      where: {
        userId: { in: followingIds },
        isPublic: true
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return {
      activities,
      total: await this.db.activity.count({
        where: {
          userId: { in: followingIds },
          isPublic: true
        }
      })
    };
  }

  /**
   * Get user's own activities
   */
  async getUserActivities(userId: string, limit: number = 20, offset: number = 0) {
    const activities = await this.db.activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return {
      activities,
      total: await this.db.activity.count({ where: { userId } })
    };
  }

  /**
   * Create a notification
   */
  async createNotification(data: NotificationData) {
    return this.db.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {}
      }
    });
  }

  /**
   * Get user notifications
   */
  async getNotifications(userId: string, limit: number = 20, offset: number = 0, unreadOnly: boolean = false) {
    const where: any = { userId };
    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await this.db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return {
      notifications,
      total: await this.db.notification.count({ where }),
      unreadCount: await this.db.notification.count({ where: { userId, read: false } })
    };
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string, userId: string) {
    return this.db.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(userId: string) {
    return this.db.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
  }

  /**
   * Extract mentions from text (@username)
   */
  extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  /**
   * Process mentions in a message and create notifications
   */
  async processMentions(text: string, context: { tipId?: string; senderId: string; message?: string }) {
    const mentions = this.extractMentions(text);
    
    if (mentions.length === 0) return;

    // Find users by username
    const users = await this.db.user.findMany({
      where: {
        username: { in: mentions }
      }
    });

    // Create notifications for mentioned users
    const sender = await this.db.user.findUnique({
      where: { id: context.senderId },
      select: { username: true, displayName: true }
    });

    const senderName = sender?.displayName || sender?.username || 'Someone';

    for (const user of users) {
      await this.createNotification({
        userId: user.id,
        type: NotificationType.MENTION,
        title: 'You were mentioned',
        message: `${senderName} mentioned you${context.message ? `: ${context.message}` : ''}`,
        metadata: {
          senderId: context.senderId,
          tipId: context.tipId,
          message: context.message
        }
      });
    }
  }

  /**
   * Get user profile with social stats
   */
  async getUserProfile(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        badges: {
          include: {
            badge: true
          },
          take: 10,
          orderBy: { earnedAt: 'desc' }
        },
        _count: {
          select: {
            tipsSent: true,
            tipsReceived: true,
            badges: true
          }
        }
      }
    });

    if (!user) return null;

    return {
      ...user,
      stats: {
        tipsSent: user._count.tipsSent,
        tipsReceived: user._count.tipsReceived,
        badges: user._count.badges
      }
    };
  }
}

