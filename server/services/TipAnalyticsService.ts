import { DatabaseService } from './DatabaseService';
import { CacheService } from './CacheService';
import { Prisma } from '@prisma/client';

type TipWithRelations = Prisma.TipGetPayload<{
    include: { sender: true; recipient: true }
}>;

type Tip = Prisma.TipGetPayload<{}>;

export interface TipStats {
    totalTips: number;
    totalAmount: string;
    averageAmount: string;
    totalUsers: number;
    topTippers: Array<{ userId: string; count: number; totalAmount: string }>;
    topRecipients: Array<{ userId: string; count: number; totalAmount: string }>;
    tipsByToken: { [token: string]: { count: number; totalAmount: string } };
    tipsByDay: Array<{ date: string; count: number; totalAmount: string }>;
}

export interface UserTipAnalytics {
    userId: string;
    tipsSent: number;
    tipsReceived: number;
    totalSent: string;
    totalReceived: string;
    averageSent: string;
    averageReceived: string;
    favoriteRecipients: Array<{ userId: string; count: number; totalAmount: string }>;
    favoriteSenders: Array<{ userId: string; count: number; totalAmount: string }>;
    tipStreak: number;
    lastTipDate: Date | null;
}

export interface TipTrend {
    period: string;
    count: number;
    totalAmount: string;
    growth: number; // Percentage growth from previous period
}

export class TipAnalyticsService {
    private db = DatabaseService.getInstance();
    private cache = CacheService.getInstance();

    /**
     * Get overall platform statistics
     */
    async getPlatformStats(useCache: boolean = true): Promise<TipStats> {
        const cacheKey = 'analytics:platform-stats';
        if (useCache) {
            const cached = await this.cache.get(cacheKey);
            if (cached) return JSON.parse(cached);
        }

        const [totalTips, tips] = await Promise.all([
            this.db.tip.count({ where: { status: 'COMPLETED' } }),
            this.db.tip.findMany({
                where: { status: 'COMPLETED' },
                include: { sender: true, recipient: true },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Calculate totals and averages
        let totalAmount = BigInt(0);
        const tokenMap: { [key: string]: { count: number; total: bigint } } = {};

        tips.forEach(tip => {
            const amount = BigInt(tip.amount);
            totalAmount += amount;

            if (!tokenMap[tip.token]) {
                tokenMap[tip.token] = { count: 0, total: BigInt(0) };
            }
            tokenMap[tip.token].count++;
            tokenMap[tip.token].total += amount;
        });

        const averageAmount = totalTips > 0 ? totalAmount / BigInt(totalTips) : BigInt(0);

        // Get unique users
        const uniqueUsers = new Set([
            ...tips.map(t => t.senderId),
            ...tips.map(t => t.recipientId)
        ]);

        // Top tippers (by count)
        const tipperMap: { [key: string]: { count: number; total: bigint } } = {};
        tips.forEach(tip => {
            if (!tipperMap[tip.senderId]) {
                tipperMap[tip.senderId] = { count: 0, total: BigInt(0) };
            }
            tipperMap[tip.senderId].count++;
            tipperMap[tip.senderId].total += BigInt(tip.amount);
        });

        const topTippers = Object.entries(tipperMap)
            .map(([userId, stats]) => ({
                userId,
                count: stats.count,
                totalAmount: stats.total.toString()
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Top recipients
        const recipientMap: { [key: string]: { count: number; total: bigint } } = {};
        tips.forEach(tip => {
            if (!recipientMap[tip.recipientId]) {
                recipientMap[tip.recipientId] = { count: 0, total: BigInt(0) };
            }
            recipientMap[tip.recipientId].count++;
            recipientMap[tip.recipientId].total += BigInt(tip.amount);
        });

        const topRecipients = Object.entries(recipientMap)
            .map(([userId, stats]) => ({
                userId,
                count: stats.count,
                totalAmount: stats.total.toString()
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Tips by token
        const tipsByToken: { [token: string]: { count: number; totalAmount: string } } = {};
        Object.entries(tokenMap).forEach(([token, stats]) => {
            tipsByToken[token] = {
                count: stats.count,
                totalAmount: stats.total.toString()
            };
        });

        // Tips by day (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentTips = tips.filter((t: TipWithRelations) => new Date(t.createdAt) >= thirtyDaysAgo);
        const dayMap: { [date: string]: { count: number; total: bigint } } = {};

        recentTips.forEach((tip: TipWithRelations) => {
            const date = new Date(tip.createdAt).toISOString().split('T')[0];
            if (!dayMap[date]) {
                dayMap[date] = { count: 0, total: BigInt(0) };
            }
            dayMap[date].count++;
            dayMap[date].total += BigInt(tip.amount);
        });

        const tipsByDay = Object.entries(dayMap)
            .map(([date, stats]) => ({
                date,
                count: stats.count,
                totalAmount: stats.total.toString()
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const stats: TipStats = {
            totalTips,
            totalAmount: totalAmount.toString(),
            averageAmount: averageAmount.toString(),
            totalUsers: uniqueUsers.size,
            topTippers,
            topRecipients,
            tipsByToken,
            tipsByDay
        };

        await this.cache.set(cacheKey, JSON.stringify(stats), 300); // Cache for 5 minutes
        return stats;
    }

    /**
     * Get analytics for a specific user
     */
    async getUserAnalytics(userId: string, useCache: boolean = true): Promise<UserTipAnalytics> {
        const cacheKey = `analytics:user:${userId}`;
        if (useCache) {
            const cached = await this.cache.get(cacheKey);
            if (cached) return JSON.parse(cached);
        }

        const [sentTips, receivedTips] = await Promise.all([
            this.db.tip.findMany({
                where: { senderId: userId, status: 'COMPLETED' },
                include: { recipient: true },
                orderBy: { createdAt: 'desc' }
            }),
            this.db.tip.findMany({
                where: { recipientId: userId, status: 'COMPLETED' },
                include: { sender: true },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Calculate totals
        let totalSent = BigInt(0);
        let totalReceived = BigInt(0);

        sentTips.forEach((tip: TipWithRelations) => {
            totalSent += BigInt(tip.amount);
        });

        receivedTips.forEach((tip: TipWithRelations) => {
            totalReceived += BigInt(tip.amount);
        });

        const averageSent = sentTips.length > 0 ? totalSent / BigInt(sentTips.length) : BigInt(0);
        const averageReceived = receivedTips.length > 0 ? totalReceived / BigInt(receivedTips.length) : BigInt(0);

        // Favorite recipients
        const recipientMap: { [key: string]: { count: number; total: bigint } } = {};
        sentTips.forEach((tip: TipWithRelations) => {
            if (!recipientMap[tip.recipientId]) {
                recipientMap[tip.recipientId] = { count: 0, total: BigInt(0) };
            }
            recipientMap[tip.recipientId].count++;
            recipientMap[tip.recipientId].total += BigInt(tip.amount);
        });

        const favoriteRecipients = Object.entries(recipientMap)
            .map(([userId, stats]) => ({
                userId,
                count: stats.count,
                totalAmount: stats.total.toString()
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Favorite senders
        const senderMap: { [key: string]: { count: number; total: bigint } } = {};
        receivedTips.forEach((tip: TipWithRelations) => {
            if (!senderMap[tip.senderId]) {
                senderMap[tip.senderId] = { count: 0, total: BigInt(0) };
            }
            senderMap[tip.senderId].count++;
            senderMap[tip.senderId].total += BigInt(tip.amount);
        });

        const favoriteSenders = Object.entries(senderMap)
            .map(([userId, stats]) => ({
                userId,
                count: stats.count,
                totalAmount: stats.total.toString()
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Calculate tip streak
        let tipStreak = 0;
        let lastTipDate: Date | null = null;

        if (sentTips.length > 0) {
            lastTipDate = sentTips[0].createdAt;
            const sortedByDate = [...sentTips].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            let currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);

            for (const tip of sortedByDate) {
                const tipDate = new Date(tip.createdAt);
                tipDate.setHours(0, 0, 0, 0);

                const daysDiff = Math.floor((currentDate.getTime() - tipDate.getTime()) / (1000 * 60 * 60 * 24));

                if (daysDiff === tipStreak) {
                    tipStreak++;
                    currentDate = tipDate;
                } else if (daysDiff > tipStreak) {
                    break;
                }
            }
        }

        const analytics: UserTipAnalytics = {
            userId,
            tipsSent: sentTips.length,
            tipsReceived: receivedTips.length,
            totalSent: totalSent.toString(),
            totalReceived: totalReceived.toString(),
            averageSent: averageSent.toString(),
            averageReceived: averageReceived.toString(),
            favoriteRecipients,
            favoriteSenders,
            tipStreak,
            lastTipDate
        };

        await this.cache.set(cacheKey, JSON.stringify(analytics), 600); // Cache for 10 minutes
        return analytics;
    }

    /**
     * Get tip trends over time
     */
    async getTipTrends(period: 'day' | 'week' | 'month' = 'day', limit: number = 30): Promise<TipTrend[]> {
        const cacheKey = `analytics:trends:${period}:${limit}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const tips = await this.db.tip.findMany({
            where: { status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            take: limit * 10 // Get more to ensure we have enough data
        });

        const periodMap: { [key: string]: { count: number; total: bigint } } = {};

        tips.forEach((tip: Tip) => {
            const date = new Date(tip.createdAt);
            let key: string;

            if (period === 'day') {
                key = date.toISOString().split('T')[0];
            } else if (period === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().split('T')[0];
            } else {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }

            if (!periodMap[key]) {
                periodMap[key] = { count: 0, total: BigInt(0) };
            }
            periodMap[key].count++;
            periodMap[key].total += BigInt(tip.amount);
        });

        const trends: TipTrend[] = Object.entries(periodMap)
            .map(([period, stats]) => ({
                period,
                count: stats.count,
                totalAmount: stats.total.toString(),
                growth: 0 // Will calculate below
            }))
            .sort((a, b) => a.period.localeCompare(b.period))
            .slice(0, limit);

        // Calculate growth percentages
        for (let i = 1; i < trends.length; i++) {
            const prev = trends[i - 1];
            const current = trends[i];
            if (prev.count > 0) {
                current.growth = ((current.count - prev.count) / prev.count) * 100;
            }
        }

        await this.cache.set(cacheKey, JSON.stringify(trends), 600);
        return trends;
    }

    /**
     * Get real-time tip feed (recent tips)
     */
    async getTipFeed(limit: number = 20): Promise<any[]> {
        const cacheKey = `analytics:feed:${limit}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const tips = await this.db.tip.findMany({
            where: { status: 'COMPLETED' },
            include: {
                sender: true,
                recipient: true
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        const feed = tips.map((tip: TipWithRelations) => ({
            id: tip.id,
            senderId: tip.senderId,
            recipientId: tip.recipientId,
            amount: tip.amount,
            token: tip.token,
            message: tip.message,
            createdAt: tip.createdAt,
            txHash: tip.txHash
        }));

        await this.cache.set(cacheKey, JSON.stringify(feed), 60); // Cache for 1 minute (near real-time)
        return feed;
    }

    /**
     * Clear analytics cache (useful after major updates)
     */
    async clearCache(pattern?: string): Promise<void> {
        if (pattern) {
            // Clear specific pattern (implementation depends on Redis setup)
            // This is a placeholder - actual implementation would use Redis SCAN
            console.log(`Clearing cache pattern: ${pattern}`);
        } else {
            // Clear all analytics cache
            const keys = ['analytics:platform-stats', 'analytics:trends', 'analytics:feed'];
            for (const key of keys) {
                await this.cache.del(key);
            }
        }
    }
}

