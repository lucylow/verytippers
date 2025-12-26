/**
 * Seed Mock Data Script
 * Generates mock.json for frontend fallback
 */

const fs = require('fs');
const path = require('path');

const data = {
  leaderboard: [
    { username: 'CryptoKing', address: '0x1234...5678', very: 1280 },
    { username: 'DevMaster', address: '0xabcd...ef01', very: 950 },
    { username: 'Alice', address: '0x9876...5432', very: 720 },
    { username: 'Bob', address: '0xfedc...ba98', very: 650 },
    { username: 'Charlie', address: '0x2468...ace0', very: 580 }
  ],
  tips: [
    {
      from: '0xabc1234567890123456789012345678901234567',
      to: '0xdef9876543210987654321098765432109876543',
      amount: 5,
      cid: 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
      timestamp: Date.now() - 3600000
    },
    {
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      amount: 10,
      cid: 'QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      timestamp: Date.now() - 7200000
    }
  ],
  stats: {
    totalTips: 1247,
    totalAmount: 45680,
    activeUsers: 342,
    tipsToday: 23
  }
};

const outputPath = path.join(__dirname, '../public/mock.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log('✅ Seeded public/mock.json');

