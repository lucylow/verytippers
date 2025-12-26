# VeryTippers Web3 Integration

A production-grade Web3 integration system for VeryTippers, featuring gas sponsorship, real-time event listening, and robust error handling.

## Features

✅ **Network Auto-Switch** - Automatically switches to Very Chain  
✅ **VERY ERC-20 Balance** - Real blockchain queries with mock fallback  
✅ **Nonce Management** - Replay attack prevention  
✅ **Meta-Transaction Builder** - Deadline-protected transactions  
✅ **EIP-712 Signing** - Production-grade typed data signing  
✅ **Gas Sponsorship** - Track and manage sponsored gas budget  
✅ **Event Indexer** - Real-time blockchain event listening  
✅ **Unified API** - Simple, consistent interface for all Web3 operations  

## Quick Start

### Using the React Hook

```tsx
import { useWeb3 } from '@/hooks/useWeb3';

function MyComponent() {
  const {
    isConnected,
    address,
    veryBalance,
    gasBudget,
    connect,
    sendTip
  } = useWeb3();

  const handleTip = async () => {
    const result = await sendTip(
      '0xRecipientAddress...',
      10.5, // amount in VERY
      'QmIPFSCID...', // IPFS CID for message
      { useGasSponsorship: true }
    );

    if (result.success) {
      console.log('Tip sent!', result.transactionHash);
    }
  };

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Balance: {veryBalance?.formatted} VERY</p>
          <p>Gas Budget: ${gasBudget.remainingUSD.toFixed(2)}</p>
          <button onClick={handleTip}>Send Tip</button>
        </div>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### Direct API Usage

```typescript
import {
  sendVeryTip,
  getVeryBalance,
  ensureVeryNetwork,
  subscribeTips
} from '@/lib/web3';

// Send a tip
const result = await sendVeryTip({
  from: '0xYourAddress...',
  to: '0xRecipientAddress...',
  amount: 10.5,
  cid: 'QmIPFSCID...',
  options: {
    useGasSponsorship: true,
    deadline: Math.floor(Date.now() / 1000) + 300 // 5 minutes
  }
});

// Get balance
const balance = await getVeryBalance('0xYourAddress...');
console.log(balance.formatted); // "42.50 VERY"

// Ensure network
await ensureVeryNetwork();

// Subscribe to events
const cleanup = subscribeTips((event) => {
  console.log('New tip:', event);
});
```

## Module Structure

### `config.ts`
Configuration for Very Chain, contract addresses, and feature flags.

### `network.ts`
Network management:
- `ensureVeryNetwork()` - Auto-switch to Very Chain
- `getNetworkStatus()` - Get current network status
- `onNetworkChange()` - Listen for network changes

### `balance.ts`
Balance fetching:
- `getVeryBalance(address)` - Get VERY token balance
- `getNativeBalance(address)` - Get native VERY balance
- `watchBalance()` - Watch balance changes

### `nonce.ts`
Nonce management:
- `getNonce(address)` - Get next nonce (prevents replay)
- `peekNonce(address)` - Check current nonce
- `resetNonce(address)` - Reset nonce (use with caution)

### `metaTx.ts`
Meta-transaction building:
- `buildMetaTx()` - Create meta-transaction
- `validateMetaTx()` - Validate meta-transaction
- `isMetaTxExpired()` - Check if expired
- `formatTimeRemaining()` - Human-readable time remaining

### `signMetaTx.ts`
EIP-712 signing:
- `signMetaTx()` - Sign meta-transaction
- `signMetaTxAuto()` - Auto-get signer and sign
- `verifyMetaTxSignature()` - Verify signature

### `relayerBudget.ts`
Gas sponsorship tracking:
- `getGasBudget()` - Get current budget
- `chargeGas(costUSD)` - Charge from budget
- `estimateGasCostUSD()` - Estimate gas cost
- `hasEnoughBudget()` - Check if enough budget

### `indexer.ts`
Event listening:
- `subscribeTips()` - Subscribe to tip events
- `subscribeBadges()` - Subscribe to badge events
- `fetchPastTips()` - Fetch historical tips

### `index.ts`
Unified API - exports all functions for easy importing.

## Environment Variables

```env
# Contract Addresses
VITE_TIP_CONTRACT_ADDRESS=0x...
VITE_VERY_TOKEN_ADDRESS=0x...
VITE_BADGE_CONTRACT_ADDRESS=0x...

# Feature Flags
VITE_ENABLE_GAS_SPONSORSHIP=true
VITE_ENABLE_MOCK_MODE=false
VITE_ENABLE_EVENT_LISTENING=true
```

## Mock Mode

For hackathon demos, enable mock mode:

```env
VITE_ENABLE_MOCK_MODE=true
```

This provides:
- Mock balances (consistent per address)
- Mock event streams
- No actual blockchain calls

## Gas Sponsorship

The system tracks a gas sponsorship budget (default: $25 USD). When `useGasSponsorship: true`:

1. Checks if enough budget remains
2. Submits via relayer endpoint
3. Charges from budget
4. Falls back to regular transaction if budget insufficient

## Error Handling

All functions throw or return errors with clear messages:

```typescript
try {
  await sendVeryTip({ ... });
} catch (error) {
  if (error.message.includes('rejected')) {
    // User rejected transaction
  } else if (error.message.includes('network')) {
    // Network issue
  }
}
```

## Best Practices

1. **Always check network** - Use `ensureVeryNetwork()` before transactions
2. **Handle errors gracefully** - Show user-friendly messages
3. **Refresh balances** - After transactions, refresh balances
4. **Clean up subscriptions** - Return cleanup functions from `subscribe*`
5. **Use gas sponsorship wisely** - Check budget before enabling

## Migration from Legacy Code

The old `web3.ts` functions are still available but deprecated. Migrate to:

```typescript
// Old
import { signTipMetaTx } from '@/lib/web3';

// New
import { signMetaTxAuto, buildMetaTx, getNonce } from '@/lib/web3';
```

## Examples

See `Web3Status.tsx` component for a complete example of using the Web3 hook.

## Support

For issues or questions, check the main README or open an issue.


