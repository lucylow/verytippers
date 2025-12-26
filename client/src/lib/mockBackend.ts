/**
 * Improved Mock Backend for VeryTippers Demo
 * 
 * Simulates:
 * - IPFS add (returns CID)
 * - Meta-tx creation
 * - Relayer signing/submitting to chain (returns txHash after delay)
 * - Indexer confirming transactions and updating DB & leaderboards
 * 
 * Provides subscription mechanism for real-time UI updates
 */

import { User, Tip, MetaTx } from '@/types/mock';
import { wait, makeCID, makeTxHash, uid } from '@/lib/utils';

type UpdateCallback = () => void;

class MockBackend {
  users: User[] = [];
  tips: Tip[] = [];
  nonceCounter = 1000;
  callbacks: UpdateCallback[] = [];

  constructor() {
    // Initialize with demo users
    this.users = [
      { id: 'u1', handle: 'alice', displayName: 'Alice', balance: 1200 },
      { id: 'u2', handle: 'devmaster', displayName: 'DevMaster', balance: 950 },
      { id: 'u3', handle: 'cryptoking', displayName: 'CryptoKing', balance: 1280 },
      { id: 'u4', handle: 'you', displayName: 'You', balance: 30 },
    ];

    // Seed with some initial tips
    this.tips = [
      {
        id: 't1',
        fromUserId: 'u3',
        toUserId: 'u1',
        amount: 5,
        cid: 'QmStartCid1',
        txHash: '0xaaaa1111',
        confirmed: true,
        createdAt: Date.now() - 1000 * 60 * 60,
      },
      {
        id: 't2',
        fromUserId: 'u2',
        toUserId: 'u1',
        amount: 10,
        cid: 'QmStartCid2',
        txHash: '0xbbbb2222',
        confirmed: true,
        createdAt: Date.now() - 1000 * 60 * 40,
      },
    ];
  }

  /**
   * Subscribe to backend updates
   * Returns unsubscribe function
   */
  onUpdate(cb: UpdateCallback) {
    this.callbacks.push(cb);
    return () => {
      this.callbacks = this.callbacks.filter(x => x !== cb);
    };
  }

  private notify() {
    this.callbacks.forEach(cb => cb());
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    await wait(80);
    return this.users.map(u => ({ ...u }));
  }

  /**
   * Get all tips
   */
  async getTips(): Promise<Tip[]> {
    await wait(50);
    return this.tips.map(t => ({ ...t }));
  }

  /**
   * Get leaderboard (top N users by total received)
   */
  async getLeaderboard(top = 10): Promise<Array<{ user: User; totalReceived: number }>> {
    await wait(60);
    
    // Compute totals by summing received tips
    const map = new Map<string, number>();
    for (const t of this.tips) {
      if (t.confirmed) {
        if (!map.has(t.toUserId)) map.set(t.toUserId, 0);
        map.set(t.toUserId, map.get(t.toUserId)! + t.amount);
      }
    }

    // Build leaderboard
    const ranks = this.users
      .map(u => ({ user: u, totalReceived: map.get(u.id) || 0 }))
      .sort((a, b) => b.totalReceived - a.totalReceived)
      .slice(0, top);

    return ranks;
  }

  /**
   * Mock IPFS add operation
   */
  async ipfsAdd(encryptedPayload: string): Promise<string> {
    await wait(120);
    return makeCID();
  }

  /**
   * Create meta-transaction
   */
  async createMetaTx(toUserHandle: string, amount: number, cid: string): Promise<MetaTx> {
    await wait(60);
    
    const toUser = this.users.find(u => u.handle === toUserHandle);
    const meta: MetaTx = {
      metaTxId: uid('meta_'),
      to: toUser ? toUser.id : toUserHandle,
      amount,
      cid,
      nonce: ++this.nonceCounter,
    };
    
    return meta;
  }

  /**
   * Relayer signs and submits metaTx
   * Returns txHash immediately, confirms after delay
   */
  async relayerSubmit(meta: MetaTx, fromUserId: string): Promise<string> {
    // Mock relayer signature
    meta.signature = 'relayerSig:' + uid();
    
    // Generate tx hash
    const txHash = makeTxHash();

    // Create pending tip record
    const tip: Tip = {
      id: uid('tip_'),
      fromUserId,
      toUserId: meta.to,
      amount: meta.amount,
      cid: meta.cid,
      signedPayload: JSON.stringify(meta),
      txHash,
      confirmed: false,
      createdAt: Date.now(),
    };

    // Add to tips array (pending)
    this.tips.unshift(tip);
    this.notify();

    // Simulate on-chain confirmation after delay
    setTimeout(() => {
      const found = this.tips.find(t => t.id === tip.id);
      if (found) {
        found.confirmed = true;
      }

      // Update balances
      const from = this.users.find(u => u.id === fromUserId);
      const to = this.users.find(u => u.id === meta.to);
      
      if (from) {
        from.balance = Math.max(0, from.balance - meta.amount);
      }
      if (to) {
        to.balance = (to.balance || 0) + meta.amount;
      }

      // Notify subscribers
      this.notify();
    }, 1800 + Math.random() * 1200); // 1.8-3.0s delay

    return txHash;
  }

  /**
   * High-level tip processing: end-to-end flow
   */
  async processTip(
    fromUserId: string,
    toHandle: string,
    amount: number,
    message?: string
  ): Promise<{ cid: string; metaTx: MetaTx; txHash: string }> {
    // 1. Client signs payload (mock)
    const clientSigned = 'clientSig:' + uid();

    // 2. Encrypt and add to IPFS
    const encrypted = `ENCRYPTED(${clientSigned}::${message || ''})`;
    const cid = await this.ipfsAdd(encrypted);

    // 3. Create meta-transaction
    const metaTx = await this.createMetaTx(toHandle, amount, cid);

    // 4. Submit to relayer
    const txHash = await this.relayerSubmit(metaTx, fromUserId);

    return { cid, metaTx, txHash };
  }
}

// Export singleton instance
export const mockBackend = new MockBackend();

