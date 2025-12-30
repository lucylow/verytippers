/**
 * Mock Data for Demo
 * Used when chain/indexer is unavailable
 */

export const MOCK_LEADERBOARD = [
  { rank: 1, name: 'CryptoKing', address: '0x1234...5678', amount: 1280, very: 1280, tips: 156, avatar: '👑' },
  { rank: 2, name: 'DevMaster', address: '0xabcd...ef01', amount: 950, very: 950, tips: 89, avatar: '💻' },
  { rank: 3, name: 'alice', address: '0x9876...5432', amount: 720, very: 720, tips: 67, avatar: '🌸' },
  { rank: 4, name: 'bob', address: '0xfedc...ba98', amount: 650, very: 650, tips: 54, avatar: '🎸' },
  { rank: 5, name: 'charlie', address: '0x2468...ace0', amount: 580, very: 580, tips: 48, avatar: '🚀' },
  { rank: 6, name: 'demo_user', address: '0x1357...bdf0', amount: 420, very: 420, tips: 42, avatar: '✨' },
  { rank: 7, name: 'carla', address: '0x8642...1379', amount: 350, very: 350, tips: 35, avatar: '🎨' },
  { rank: 8, name: 'dave', address: '0x7531...eca8', amount: 280, very: 280, tips: 28, avatar: '🔥' }
];

export const MOCK_TIPS = [
  {
    id: 't1',
    from: '0xabc1234567890123456789012345678901234567',
    fromName: 'bob',
    to: '0xdef9876543210987654321098765432109876543',
    toName: 'alice',
    amount: 5,
    very: 5,
    cid: 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
    message: 'Great work on the project!',
    timestamp: Date.now() - 3600000,
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    status: 'confirmed'
  },
  {
    id: 't2',
    from: '0x1111111111111111111111111111111111111111',
    fromName: 'carla',
    to: '0x2222222222222222222222222222222222222222',
    toName: 'alice',
    amount: 10,
    very: 10,
    cid: 'QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    message: 'Thanks for the help!',
    timestamp: Date.now() - 7200000,
    txHash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
    status: 'confirmed'
  },
  {
    id: 't3',
    from: '0x3333333333333333333333333333333333333333',
    fromName: 'demo_user',
    to: '0x4444444444444444444444444444444444444444',
    toName: 'bob',
    amount: 3,
    very: 3,
    cid: 'QmYyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
    message: 'Keep it up!',
    timestamp: Date.now() - 10800000,
    txHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
    status: 'confirmed'
  },
  {
    id: 't4',
    from: '0x5555555555555555555555555555555555555555',
    fromName: 'CryptoKing',
    to: '0x6666666666666666666666666666666666666666',
    toName: 'charlie',
    amount: 20,
    very: 20,
    cid: 'QmZzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
    message: 'Amazing contribution!',
    timestamp: Date.now() - 14400000,
    txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    status: 'confirmed'
  }
];

export const MOCK_BADGES = [
  { id: 1, name: 'First Tip', description: 'Sent your first tip', icon: '🎉', rarity: 'common', awardedAt: new Date().toISOString() },
  { id: 2, name: 'Generous', description: 'Tipped 100+ VERY total', icon: '💰', rarity: 'rare', awardedAt: new Date().toISOString() },
  { id: 3, name: 'Community Builder', description: 'Received 50+ tips', icon: '🏆', rarity: 'epic', awardedAt: new Date().toISOString() },
  { id: 4, name: 'Week Streaker', description: '7-day tipping streak', icon: '🔥', rarity: 'rare', awardedAt: new Date().toISOString() },
  { id: 5, name: 'Voice Pioneer', description: 'First voice tip sent', icon: '🎤', rarity: 'uncommon', awardedAt: new Date().toISOString() },
  { id: 6, name: 'DAO Voter', description: 'Voted on 5+ proposals', icon: '🗳️', rarity: 'uncommon', awardedAt: new Date().toISOString() }
];

export const MOCK_STATS = {
  totalTips: 1247,
  totalAmount: 45680,
  activeUsers: 342,
  tipsToday: 23,
  avgTipSize: 3.5,
  topTipper: 'CryptoKing'
};

