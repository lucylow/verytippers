/**
 * Event Indexer
 * Real-time blockchain event listening with fallback
 */

import { ethers } from 'ethers';
import { CONTRACTS, FEATURES } from './config';

export interface TipEvent {
  from: string;
  to: string;
  amount: number;
  cid: string;
  tipId: number;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface BadgeEvent {
  user: string;
  badgeId: number;
  badgeName: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

type TipEventHandler = (event: TipEvent) => void;
type BadgeEventHandler = (event: BadgeEvent) => void;

/**
 * Subscribes to TipSubmitted events
 * Falls back to mock events if blockchain unavailable
 */
export function subscribeTips(
  onEvent: TipEventHandler,
  filterAddress?: string
): () => void {
  if (FEATURES.ENABLE_MOCK_MODE || !window.ethereum) {
    return mockEventStream(onEvent, 'tip', filterAddress);
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      CONTRACTS.tipRouter.address,
      CONTRACTS.tipRouter.abi,
      provider
    );

    // Set up filter
    let filter;
    if (filterAddress) {
      // Filter by specific address (sent or received)
      filter = contract.filters.TipSubmitted(
        filterAddress,
        null // to
      );
      // Also listen for received tips
      const receivedFilter = contract.filters.TipSubmitted(
        null, // from
        filterAddress
      );
      contract.on(receivedFilter, createTipHandler(onEvent));
    } else {
      filter = contract.filters.TipSubmitted();
    }

    contract.on(filter, createTipHandler(onEvent));

    // Return cleanup function
    return () => {
      contract.removeAllListeners();
    };
  } catch (error) {
    console.warn('Failed to subscribe to real events, using mock:', error);
    return mockEventStream(onEvent, 'tip', filterAddress);
  }
}

/**
 * Subscribes to BadgeMinted events
 */
export function subscribeBadges(
  onEvent: BadgeEventHandler,
  filterAddress?: string
): () => void {
  if (FEATURES.ENABLE_MOCK_MODE || !window.ethereum) {
    return mockEventStream(onEvent, 'badge', filterAddress);
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      CONTRACTS.badgeFactory.address,
      CONTRACTS.badgeFactory.abi,
      provider
    );

    const filter = filterAddress
      ? contract.filters.BadgeMinted(filterAddress)
      : contract.filters.BadgeMinted();

    contract.on(filter, createBadgeHandler(onEvent));

    return () => {
      contract.removeAllListeners();
    };
  } catch (error) {
    console.warn('Failed to subscribe to badge events, using mock:', error);
    return mockEventStream(onEvent, 'badge', filterAddress);
  }
}

/**
 * Fetches past events from blockchain
 */
export async function fetchPastTips(
  fromBlock: number = 0,
  toBlock: number | 'latest' = 'latest',
  filterAddress?: string
): Promise<TipEvent[]> {
  if (FEATURES.ENABLE_MOCK_MODE || !window.ethereum) {
    return generateMockTips(10);
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      CONTRACTS.tipRouter.address,
      CONTRACTS.tipRouter.abi,
      provider
    );

    const filter = filterAddress
      ? contract.filters.TipSubmitted(filterAddress, null)
      : contract.filters.TipSubmitted();

    const events = await contract.queryFilter(filter, fromBlock, toBlock);

    return events.map((event) => {
      // Type guard to check if event has args (EventLog vs Log)
      if (!('args' in event) || !event.args) {
        throw new Error('Event does not have args');
      }
      const args = event.args as any;
      return {
        from: args.from,
        to: args.to,
        amount: Number(ethers.formatEther(args.amount)),
        cid: args.cid,
        tipId: args.tipId.toNumber(),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: Date.now() // Would get from block in production
      };
    });
  } catch (error) {
    console.warn('Failed to fetch past tips, using mock:', error);
    return generateMockTips(10);
  }
}

/**
 * Creates a tip event handler
 */
function createTipHandler(onEvent: TipEventHandler) {
  return async (
    from: string,
    to: string,
    amount: bigint,
    cid: string,
    tipId: bigint,
    event: ethers.Log
  ) => {
    const tipEvent: TipEvent = {
      from,
      to,
      amount: Number(ethers.formatEther(amount)),
      cid,
      tipId: Number(tipId),
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now()
    };

    onEvent(tipEvent);
  };
}

/**
 * Creates a badge event handler
 */
function createBadgeHandler(onEvent: BadgeEventHandler) {
  return async (
    user: string,
    badgeId: bigint,
    badgeName: string,
    event: ethers.Log
  ) => {
    const badgeEvent: BadgeEvent = {
      user,
      badgeId: Number(badgeId),
      badgeName,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now()
    };

    onEvent(badgeEvent);
  };
}

/**
 * Mock event stream for demos
 */
function mockEventStream(
  onEvent: TipEventHandler | BadgeEventHandler,
  type: 'tip' | 'badge',
  filterAddress?: string
): () => void {
  let intervalId: NodeJS.Timeout;
  let eventCount = 0;

  const generateEvent = () => {
    eventCount++;

    if (type === 'tip') {
      const handler = onEvent as TipEventHandler;
      handler({
        from: filterAddress || '0xMockSender0000000000000000000000001',
        to: filterAddress || '0xMockRecipient0000000000000000000001',
        amount: 5 + Math.random() * 10,
        cid: `QmMockCID${eventCount}${Date.now()}`,
        tipId: eventCount,
        txHash: `0x${Math.random().toString(16).slice(2)}`,
        blockNumber: 1000000 + eventCount,
        timestamp: Date.now()
      });
    } else {
      const handler = onEvent as BadgeEventHandler;
      handler({
        user: filterAddress || '0xMockUser00000000000000000000000001',
        badgeId: eventCount % 10,
        badgeName: `Badge ${eventCount}`,
        txHash: `0x${Math.random().toString(16).slice(2)}`,
        blockNumber: 1000000 + eventCount,
        timestamp: Date.now()
      });
    }
  };

  // Generate first event immediately
  generateEvent();

  // Then generate every 8 seconds
  intervalId = setInterval(generateEvent, 8000);

  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Generates mock tips for past events
 */
function generateMockTips(count: number): TipEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    from: `0xMockSender${i.toString().padStart(2, '0')}0000000000000000000001`,
    to: `0xMockRecipient${i.toString().padStart(2, '0')}00000000000000000001`,
    amount: 5 + Math.random() * 10,
    cid: `QmMockCID${i}${Date.now()}`,
    tipId: i + 1,
    txHash: `0x${Math.random().toString(16).slice(2)}`,
    blockNumber: 1000000 - count + i,
    timestamp: Date.now() - (count - i) * 60000 // Staggered timestamps
  }));
}

