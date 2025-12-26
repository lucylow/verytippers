# Universal Wallet Layer

This directory contains the production-grade dual-wallet integration that makes VeryTippers work seamlessly with both **MetaMask (EIP-1193)** and **Wepin Wallet**, without branching your app logic.

## Architecture

```
UI Components
 └─ WalletProvider (contexts/WalletContext.tsx)
     ├─ MetaMaskAdapter (EIP-1193)
     ├─ WepinAdapter (SDK)
     └─ UnifiedSigner
         └─ signMessage()
         └─ getAddress()
         └─ getChainId()
```

**No wallet-specific logic in components** - everything goes through the unified adapter interface.

## Quick Start

### 1. Using the Wallet Selector Component

```tsx
import { WalletSelector } from '@/wallet';

function MyPage() {
  return (
    <div>
      <WalletSelector onConnect={() => console.log('Connected!')} />
    </div>
  );
}
```

### 2. Using the Wallet Hook

```tsx
import { useWallet } from '@/contexts/WalletContext';

function MyComponent() {
  const { wallet, isConnected, address, connect, disconnect } = useWallet();

  const handleConnect = async () => {
    try {
      await connect('metamask'); // or 'wepin'
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  return (
    <div>
      {isConnected ? (
        <p>Connected: {address}</p>
      ) : (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### 3. Signing Meta-Transactions

```tsx
import { useWallet } from '@/contexts/WalletContext';
import { signMetaTx } from '@/lib/signMetaTx';
import { buildMetaTx } from '@/lib/web3/metaTx';

function TipButton() {
  const { wallet } = useWallet();

  const handleTip = async () => {
    if (!wallet) return;

    const metaTx = buildMetaTx({
      from: await wallet.getAddress(),
      to: '0x...',
      amount: 10,
      cid: 'Qm...',
      nonce: Date.now(),
    });

    const { payload, signature } = await signMetaTx(wallet, metaTx);

    // Send to relayer
    await fetch('/api/relay', {
      method: 'POST',
      body: JSON.stringify({ payload, signature }),
    });
  };

  return <button onClick={handleTip}>Send Tip</button>;
}
```

### 4. Chain Compatibility

```tsx
import { useWallet } from '@/contexts/WalletContext';
import { ensureChainCompatibility } from '@/wallet';

function MyComponent() {
  const { wallet } = useWallet();

  const handleAction = async () => {
    if (!wallet) return;

    // Ensure wallet is on VERY Chain
    await ensureChainCompatibility(wallet);

    // Proceed with action...
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

## Features

✅ **Unified Interface** - Same API for MetaMask and Wepin  
✅ **Gasless Meta-Transactions** - Works with both wallets  
✅ **Chain Compatibility** - Automatic network switching  
✅ **Backward Compatible** - Existing code continues to work  
✅ **Lovable-Safe** - No window hacks, clean architecture  
✅ **Production-Ready** - Battle-tested patterns  

## Environment Variables

For Wepin Wallet, set these in your `.env` file:

```env
VITE_WEPIN_APP_ID=your_app_id
VITE_WEPIN_APP_KEY=your_app_key
```

## Adapter Interface

All wallet adapters implement the `WalletAdapter` interface:

```typescript
interface WalletAdapter {
  id: "metamask" | "wepin";
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAddress(): Promise<string>;
  getChainId(): Promise<number>;
  signMessage(message: string): Promise<string>;
}
```

## Files

- `types.ts` - Unified wallet adapter interface
- `metamask.ts` - MetaMask adapter (EIP-1193)
- `wepin.ts` - Wepin adapter (SDK)
- `WalletContext.tsx` - React context for wallet state
- `WalletSelector.tsx` - UI component for wallet selection
- `chainCompatibility.ts` - Chain switching utilities
- `index.ts` - Unified exports

## Migration from Old System

The old `WalletContext` in `contexts/WalletContext.tsx` has been updated to use the adapter pattern internally. **No changes needed** in existing components - they continue to work as before, but now benefit from dual-wallet support.

## Next Steps

- Add EIP-712 typed data support
- Add auto-wallet detection
- Add mobile deep-link fallback
- Add wallet mocking for tests

