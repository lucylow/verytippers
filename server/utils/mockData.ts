/**
 * Mock Data Utilities for VeryTippers
 * 
 * Provides mock data for development and testing without requiring
 * external API calls or real blockchain transactions.
 */

export interface MockTipPayload {
    type: string;
    from: string;
    fromUsername: string;
    to: string;
    toUsername: string;
    amount: number;
    token: string;
    message: string;
    timestamp: string;
    clientSig: string;
}

export interface MockMetaTx {
    metaTx: {
        to: string;
        amount: string;
        token: string;
        cid: string;
        nonce: number;
        createdAt: string;
    };
    policy: {
        maxTipUsd: number;
        kycRequired: boolean;
    };
    orchestratorSig: string;
}

export interface MockHistoricalTip {
    content: string;
    amount: number;
    timestamp?: string;
}

/**
 * Generate a mock tip payload for testing
 */
export function generateMockTipPayload(
    fromUsername: string = 'bob',
    toUsername: string = 'alice',
    amount: number = 5.0,
    message: string = 'Nice thread! Here\'s a tip :)'
): MockTipPayload {
    return {
        type: 'tip_request',
        from: `0x${fromUsername}Addr${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        fromUsername,
        to: `0x${toUsername}Addr${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        toUsername,
        amount,
        token: 'VERY',
        message,
        timestamp: new Date().toISOString(),
        clientSig: `0x${Math.random().toString(16).substring(2)}signedMetaPayload`,
    };
}

/**
 * Generate a mock metaTx for relayer queue
 */
export function generateMockMetaTx(
    toAddr: string,
    amount: number = 5.0,
    cid: string = `Qm${Math.random().toString(36).substring(2, 15)}`
): MockMetaTx {
    return {
        metaTx: {
            to: toAddr,
            amount: amount.toString(),
            token: 'VERY',
            cid,
            nonce: Date.now(),
            createdAt: new Date().toISOString(),
        },
        policy: {
            maxTipUsd: 200,
            kycRequired: false,
        },
        orchestratorSig: `0x${Math.random().toString(16).substring(2)}orchestratorSig`,
    };
}

/**
 * Generate mock historical tips for dataset-based suggestions
 */
export function generateMockHistoricalTips(count: number = 10): MockHistoricalTip[] {
    const sampleContents = [
        'Great article about web3 development!',
        'Amazing tutorial, learned a lot about smart contracts',
        'Helpful explanation of DeFi protocols',
        'This really cleared up my confusion about NFTs',
        'Excellent breakdown of blockchain fundamentals',
        'Super useful guide for beginners',
        'Thanks for sharing this valuable insight',
        'This content deserves more recognition',
        'Well-written and informative post',
        'Clear and concise explanation',
        'Inspiring work, keep it up!',
        'This helped me solve a major issue',
        'Outstanding content quality',
        'Very educational and engaging',
        'Perfect timing for this information',
    ];

    const amounts = [1, 2, 3, 5, 5, 10, 10, 20, 50, 100]; // Realistic distribution

    return Array.from({ length: count }, (_, i) => ({
        content: sampleContents[i % sampleContents.length],
        amount: amounts[Math.floor(Math.random() * amounts.length)],
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date in last 30 days
    }));
}

/**
 * Generate mock IPFS content (encrypted message simulation)
 */
export function generateMockIpfsContent(
    message: string,
    from: string,
    encrypted: boolean = true
): any {
    const baseContent = {
        from,
        message: encrypted ? `encrypted_${Buffer.from(message).toString('base64')}` : message,
        timestamp: new Date().toISOString(),
    };

    if (encrypted) {
        return {
            ...baseContent,
            encryption: 'AES-256-GCM',
            version: '1.0',
        };
    }

    return baseContent;
}

/**
 * Generate mock user data for testing
 */
export function generateMockUser(username?: string): {
    id: string;
    username: string;
    walletAddress: string;
    publicKey: string;
} {
    const usernames = ['alice', 'bob', 'charlie', 'diana', 'eve', 'frank', 'grace', 'henry'];
    const selectedUsername = username || usernames[Math.floor(Math.random() * usernames.length)];
    const id = `${selectedUsername}_${Math.random().toString(36).substring(2, 9)}`;
    
    return {
        id,
        username: selectedUsername,
        walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
        publicKey: `0x${Math.random().toString(16).substring(2, 138)}`, // Mock public key
    };
}

/**
 * Generate mock tip recommendations for testing
 */
export function generateMockTipRecommendation(): {
    recommendedAmount: string;
    confidence: number;
    reasoning: string;
    contentScore: {
        quality: number;
        engagement: number;
        sentiment: string;
    };
} {
    const quality = Math.floor(Math.random() * 40) + 60; // 60-100
    const engagement = Math.floor(Math.random() * 40) + 60;
    const sentiments = ['positive', 'neutral', 'negative'];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    
    const baseAmount = 2;
    const qualityMultiplier = quality / 100;
    const engagementMultiplier = engagement / 100;
    const recommendedAmount = Math.round(baseAmount * (1 + qualityMultiplier * 2) * (1 + engagementMultiplier * 1.5) * 10) / 10;
    
    return {
        recommendedAmount: recommendedAmount.toString(),
        confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
        reasoning: `Based on content analysis: Quality score ${quality}/100, Engagement score ${engagement}/100, Sentiment: ${sentiment}.`,
        contentScore: {
            quality,
            engagement,
            sentiment,
        },
    };
}

/**
 * Generate mock message suggestions
 */
export function generateMockMessageSuggestions(
    recipientName: string = 'there',
    tipAmount: number = 5
): Array<{
    message: string;
    tone: 'friendly' | 'professional' | 'casual' | 'enthusiastic';
    score: number;
}> {
    return [
        {
            message: `Great work, ${recipientName}! Keep it up! 🚀`,
            tone: 'friendly',
            score: 0.9,
        },
        {
            message: `Loved this! Thanks for sharing. 💖`,
            tone: 'friendly',
            score: 0.85,
        },
        {
            message: `This is amazing! ${tipAmount} VERY well deserved! 🎉`,
            tone: 'enthusiastic',
            score: 0.88,
        },
        {
            message: `Nice one! Keep creating 🔥`,
            tone: 'casual',
            score: 0.82,
        },
        {
            message: `Excellent content. This deserves recognition.`,
            tone: 'professional',
            score: 0.8,
        },
    ];
}

/**
 * Fake signature generator for testing (DO NOT USE IN PRODUCTION)
 */
export function fakeSign(payload: string): string {
    const hash = Buffer.from(payload).toString('base64').slice(0, 64);
    return `0xFAKE_SIGNATURE_${hash}`;
}

/**
 * Generate mock dataset for tip amount suggestions
 */
export function generateMockTipDataset(size: number = 50): Array<{
    content: string;
    amount: number;
    quality: number;
    engagement: number;
}> {
    const contents = [
        'Great tutorial on React hooks!',
        'Amazing explanation of async/await',
        'Helpful guide for TypeScript beginners',
        'Excellent breakdown of design patterns',
        'Super useful code examples',
        'Clear explanation of state management',
        'Inspiring article about web development',
        'Perfect timing for this information',
        'Well-structured and easy to follow',
        'This really helped me understand the concept',
    ];

    return Array.from({ length: size }, () => {
        const content = contents[Math.floor(Math.random() * contents.length)];
        const quality = Math.floor(Math.random() * 40) + 60;
        const engagement = Math.floor(Math.random() * 40) + 60;
        const baseAmount = 2;
        const amount = Math.round(
            baseAmount * (1 + quality / 100 * 2) * (1 + engagement / 100 * 1.5) * 10
        ) / 10;

        return {
            content,
            amount,
            quality,
            engagement,
        };
    });
}


