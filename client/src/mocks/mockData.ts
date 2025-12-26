/**
 * Mock Data for Demo
 * Used when chain/indexer is unavailable
 */

export const MOCK_LEADERBOARD = [
  { name: 'CryptoKing', address: '0x1234...5678', amount: 1280, very: 1280 },
  { name: 'DevMaster', address: '0xabcd...ef01', amount: 950, very: 950 },
  { name: 'Alice', address: '0x9876...5432', amount: 720, very: 720 },
  { name: 'Bob', address: '0xfedc...ba98', amount: 650, very: 650 },
  { name: 'Charlie', address: '0x2468...ace0', amount: 580, very: 580 }
];

export const MOCK_TIPS = [
  {
    from: '0xabc1234567890123456789012345678901234567',
    to: '0xdef9876543210987654321098765432109876543',
    amount: 5,
    very: 5,
    cid: 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
    message: 'Great work on the project!',
    timestamp: Date.now() - 3600000, // 1 hour ago
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  },
  {
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    amount: 10,
    very: 10,
    cid: 'QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    message: 'Thanks for the help!',
    timestamp: Date.now() - 7200000, // 2 hours ago
    txHash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef'
  },
  {
    from: '0x3333333333333333333333333333333333333333',
    to: '0x4444444444444444444444444444444444444444',
    amount: 3,
    very: 3,
    cid: 'QmYyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
    message: 'Keep it up!',
    timestamp: Date.now() - 10800000, // 3 hours ago
    txHash: '0x9876543210987654321098765432109876543210987654321098765432109876'
  }
];

export const MOCK_BADGES = [
  { id: 1, name: 'First Tip', description: 'Sent your first tip', icon: '🎉' },
  { id: 2, name: 'Generous', description: 'Tipped 100+ VERY', icon: '💰' },
  { id: 3, name: 'Community Builder', description: 'Received 50+ tips', icon: '🏆' }
];

export const MOCK_STATS = {
  totalTips: 1247,
  totalAmount: 45680,
  activeUsers: 342,
  tipsToday: 23
};

