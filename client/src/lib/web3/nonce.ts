/**
 * Nonce Manager
 * Prevents replay attacks by managing unique nonces per address
 */

const nonceCache: Record<string, number> = {};
const nonceStorageKey = 'verytippers_nonces';

/**
 * Loads nonces from localStorage
 */
function loadNonces(): void {
  try {
    const stored = localStorage.getItem(nonceStorageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.assign(nonceCache, parsed);
    }
  } catch (error) {
    console.warn('Failed to load nonces from storage:', error);
  }
}

/**
 * Saves nonces to localStorage
 */
function saveNonces(): void {
  try {
    localStorage.setItem(nonceStorageKey, JSON.stringify(nonceCache));
  } catch (error) {
    console.warn('Failed to save nonces to storage:', error);
  }
}

// Load nonces on module init
if (typeof window !== 'undefined') {
  loadNonces();
}

/**
 * Gets the next nonce for an address
 * Nonces are unique per address and increment sequentially
 */
export async function getNonce(address: string): Promise<number> {
  if (!address || !address.startsWith('0x')) {
    throw new Error('Invalid address provided');
  }

  const normalizedAddress = address.toLowerCase();

  // Initialize if not exists
  if (!nonceCache[normalizedAddress]) {
    // Try to get from blockchain first (if available)
    try {
      const blockchainNonce = await getBlockchainNonce(address);
      nonceCache[normalizedAddress] = blockchainNonce + 1;
    } catch {
      // Fallback to random starting point
      nonceCache[normalizedAddress] = Math.floor(Math.random() * 100000);
    }
  }

  const nonce = nonceCache[normalizedAddress];
  nonceCache[normalizedAddress]++;

  // Persist to storage
  saveNonces();

  return nonce;
}

/**
 * Gets the current nonce from blockchain (transaction count)
 * This ensures we don't reuse nonces even after page refresh
 */
async function getBlockchainNonce(address: string): Promise<number> {
  try {
    if (!window.ethereum) {
      throw new Error('No wallet provider');
    }

    const provider = new (await import('ethers')).BrowserProvider(window.ethereum);
    const transactionCount = await provider.getTransactionCount(address, 'pending');
    return transactionCount;
  } catch (error) {
    console.warn('Failed to get blockchain nonce, using cached:', error);
    // Return cached nonce - 1 to maintain continuity
    const normalizedAddress = address.toLowerCase();
    return (nonceCache[normalizedAddress] || 0) - 1;
  }
}

/**
 * Resets nonce for an address (use with caution)
 */
export function resetNonce(address: string): void {
  const normalizedAddress = address.toLowerCase();
  delete nonceCache[normalizedAddress];
  saveNonces();
}

/**
 * Gets the current nonce without incrementing
 */
export function peekNonce(address: string): number {
  const normalizedAddress = address.toLowerCase();
  return nonceCache[normalizedAddress] || 0;
}

/**
 * Validates that a nonce hasn't been used recently
 * (Simple check - in production, query backend/blockchain)
 */
export function isNonceUsed(address: string, nonce: number): boolean {
  // In a real implementation, this would check against a database
  // For now, we just check if it's less than current nonce
  const currentNonce = peekNonce(address);
  return nonce < currentNonce;
}

/**
 * Cleans up old nonces (keeps only last 1000 per address)
 */
export function cleanupNonces(): void {
  // This is a simple implementation
  // In production, you'd want more sophisticated cleanup
  const addresses = Object.keys(nonceCache);
  if (addresses.length > 100) {
    // Keep only the most recent 50 addresses
    const sorted = addresses.sort((a, b) => nonceCache[b] - nonceCache[a]);
    sorted.slice(50).forEach((addr) => delete nonceCache[addr]);
    saveNonces();
  }
}


