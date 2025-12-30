import React, { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_LEADERBOARD, MOCK_TIPS, MOCK_BADGES, MOCK_STATS } from '@/mocks/mockData';

export interface DemoUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  address: string;
}

export interface DemoContextValue {
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  user: DemoUser | null;
  data: typeof mockDataExtended;
  isWalletConnected: boolean;
}

// Extended mock data for all pages
export const mockDataExtended = {
  tips: MOCK_TIPS,
  leaderboard: MOCK_LEADERBOARD,
  badges: MOCK_BADGES,
  stats: MOCK_STATS,
  
  // DAO governance data
  dao: {
    totalSupply: 1_000_000,
    treasury: 12_500,
    totalTips: 3200,
    activeProposals: 2,
    proposals: [
      { id: 1, title: 'Sponsor Community Pool', description: 'Allocate 500 VERY to community pool for gasless tipping subsidies', votesFor: 48000, votesAgainst: 1200, status: 'active', tipsBoost: 12000, endsAt: Date.now() + 86400000 * 3 },
      { id: 2, title: 'Grant: UX Improvements', description: 'Approve 800 VERY for UX/UI improvements to the tipping interface', votesFor: 42000, votesAgainst: 1800, status: 'active', tipsBoost: 8000, endsAt: Date.now() + 86400000 * 5 },
      { id: 3, title: 'Partnership: VeryChat Integration', description: 'Fund VeryChat integration development', votesFor: 35000, votesAgainst: 5000, status: 'passed', tipsBoost: 5000, endsAt: Date.now() - 86400000 }
    ],
    voterPower: {
      tokenPower: 120,
      nftPower: 40,
      tipsPower: 12000,
      totalPower: 12260
    }
  },

  // NFT marketplace data
  nfts: [
    { id: 1, name: 'Tip Legend #001', image: '/placeholder.svg', price: 50, owner: 'CryptoKing', rarity: 'Legendary', description: 'Awarded to top tippers' },
    { id: 2, name: 'Community Builder', image: '/placeholder.svg', price: 25, owner: 'alice', rarity: 'Epic', description: 'For community contributors' },
    { id: 3, name: 'First Tipper NFT', image: '/placeholder.svg', price: 10, owner: 'demo_user', rarity: 'Rare', description: 'First 100 tippers badge' },
    { id: 4, name: 'Voice Pioneer', image: '/placeholder.svg', price: 15, owner: 'bob', rarity: 'Rare', description: 'Early voice tipping adopter' }
  ],

  // Explorer/transactions data
  explorer: [
    { tx: '0x12ab...c', from: 'demo_user', to: 'alice', amount: 5, status: 'confirmed', block: 123456, time: Date.now() - 1000*60*60 },
    { tx: '0x34cd...e', from: 'carla', to: 'alice', amount: 1, status: 'confirmed', block: 123450, time: Date.now() - 1000*60*120 },
    { tx: '0x56ef...f', from: 'bob', to: 'demo_user', amount: 3, status: 'confirmed', block: 123445, time: Date.now() - 1000*60*180 },
    { tx: '0x78gh...g', from: 'CryptoKing', to: 'bob', amount: 10, status: 'pending', block: 123460, time: Date.now() - 1000*60*30 }
  ],

  // Voice tipping transcripts
  voiceTranscripts: [
    { id: 1, text: 'Tip @alice 5 VERY', parsed: { action: 'tip', recipient: 'alice', amount: 5 }, status: 'confirmed' },
    { id: 2, text: 'Send @bob three VERY', parsed: { action: 'tip', recipient: 'bob', amount: 3 }, status: 'confirmed' },
    { id: 3, text: 'Tip @carla ten VERY for the great work', parsed: { action: 'tip', recipient: 'carla', amount: 10 }, status: 'pending' }
  ],

  // P2P connections
  p2pPeers: [
    { id: 'peer1', name: 'alice', status: 'connected', lastSeen: Date.now() - 1000*30 },
    { id: 'peer2', name: 'bob', status: 'connected', lastSeen: Date.now() - 1000*60 },
    { id: 'peer3', name: 'carla', status: 'offline', lastSeen: Date.now() - 1000*3600 }
  ],

  // Token ecosystem data
  tokenEcosystem: {
    veryPrice: 0.042,
    priceChange24h: 5.2,
    marketCap: 420000,
    totalStaked: 250000,
    apr: 12.5,
    circulatingSupply: 10_000_000,
    holders: 1247,
    stakingRewards: [
      { tier: 'Bronze', minStake: 100, apr: 8 },
      { tier: 'Silver', minStake: 1000, apr: 10 },
      { tier: 'Gold', minStake: 10000, apr: 12.5 },
      { tier: 'Diamond', minStake: 100000, apr: 15 }
    ]
  },

  // VeryChain data
  verychain: {
    blockHeight: 1234567,
    tps: 1250,
    validators: 21,
    totalTransactions: 5_432_100,
    gasPrice: 0.001,
    networkStatus: 'healthy'
  },

  // Admin metrics
  metrics: {
    dau: 1250,
    tipsPerDay: 420,
    shareRate: 0.12,
    retention7: 0.34,
    relayerGasSpendUSD: 32.4,
    totalUsers: 4520,
    avgTipSize: 3.5
  }
};

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [demoMode, setDemoMode] = useState(true);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  // Check for wallet connection
  useEffect(() => {
    const checkWallet = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[] | null;
          const connected = Array.isArray(accounts) && accounts.length > 0;
          setIsWalletConnected(connected);
          // Auto-disable demo mode if wallet is connected
          if (connected) {
            setDemoMode(false);
          }
        } catch {
          setIsWalletConnected(false);
        }
      }
    };
    checkWallet();
  }, []);

  // Demo user when in demo mode
  const user: DemoUser | null = demoMode
    ? {
        id: 'u_demo',
        username: 'demo_user',
        displayName: 'Demo User',
        avatar: '/placeholder.svg',
        address: '0x1234...5678'
      }
    : null;

  return (
    <DemoContext.Provider value={{ demoMode, setDemoMode, user, data: mockDataExtended, isWalletConnected }}>
      {children}
    </DemoContext.Provider>
  );
};

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider');
  return ctx;
}
