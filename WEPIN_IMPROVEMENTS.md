# WePin SDK Integration Improvements

This document outlines the improvements made to the WePin SDK integration based on the official documentation at https://docs.wepin.io/en.

## Summary of Improvements

### 1. **Proper SDK Initialization**
- ✅ Implemented proper `WepinSDK` initialization using the actual SDK API
- ✅ Added support for initialization attributes (language, currency, login providers)
- ✅ Integrated `WepinProvider` for blockchain interactions
- ✅ Added proper error handling and cleanup

### 2. **Complete Wallet Connection Flow**
- ✅ Implemented proper login flow with `loginWithUI()`
- ✅ Added support for user registration when needed
- ✅ Implemented account retrieval with network filtering
- ✅ Added support for multiple accounts and networks

### 3. **Provider Integration**
- ✅ Integrated `@wepin/provider-js` for EIP-1193 compatible provider
- ✅ Added support for transaction signing via provider
- ✅ Implemented message signing using `personal_sign` (EIP-191)
- ✅ Browser-compatible implementation (no Node.js dependencies)

### 4. **Event System**
- ✅ Added event listeners for wallet state changes
- ✅ Support for `accountChanged`, `lifecycleChanged`, `widgetOpened`, `widgetClosed` events
- ✅ Proper event cleanup on component unmount

### 5. **Enhanced React Hook**
- ✅ Improved `useWepin` hook with better state management
- ✅ Added auto-connect option
- ✅ Added lifecycle status tracking
- ✅ Better error handling with callbacks
- ✅ Support for widget open/close operations

### 6. **Improved Adapter Class**
- ✅ Updated `WepinAdapter` to use the improved implementation
- ✅ Better error handling and state management
- ✅ Event listener support for account changes

### 7. **Type Safety**
- ✅ Proper TypeScript types from `@wepin/sdk-js`
- ✅ Type-safe interfaces for all methods
- ✅ Better IntelliSense support

## Key Features

### Initialization

```typescript
import { WepinWallet } from '@/lib/wepin/wepin';

const wallet = new WepinWallet();
await wallet.initialize({
  appId: 'your-app-id',
  appKey: 'your-app-key',
  attributes: {
    defaultLanguage: 'en',
    defaultCurrency: 'USD',
    loginProviders: ['google', 'email'], // Optional
  },
});
```

### Connection

```typescript
// Basic connection
const account = await wallet.connect();

// Connection with options
const account = await wallet.connect({
  email: 'user@example.com', // Pre-fill email
  network: 'very', // Filter by network
});
```

### Transaction Signing

```typescript
const txHash = await wallet.signTransaction({
  to: '0x...',
  value: '0x1000',
  data: '0x...',
  gas: '0x5208',
  gasPrice: '0x3b9aca00',
});
```

### Message Signing

```typescript
const signature = await wallet.signMessage('Hello, World!');
```

### Provider Access

```typescript
// Get EIP-1193 compatible provider
const provider = await wallet.getProvider('very');

// Use with ethers.js
import { ethers } from 'ethers';
const ethersProvider = new ethers.BrowserProvider(provider);
```

### React Hook Usage

```typescript
import { useWepin } from '@/hooks/useWepin';

function MyComponent() {
  const {
    connect,
    disconnect,
    account,
    isConnected,
    isConnecting,
    error,
    signTransaction,
    signMessage,
    getProvider,
    openWidget,
    closeWidget,
    status,
  } = useWepin({
    autoConnect: true, // Optional
    onAccountChanged: (account) => {
      console.log('Account changed:', account);
    },
    onError: (error) => {
      console.error('WePin error:', error);
    },
  });

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {account?.address}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={() => connect()} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect WePin'}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## Lifecycle Management

The WePin SDK has the following lifecycle states:

- `not_initialized` - SDK not initialized
- `initializing` - SDK is initializing
- `initialized` - SDK initialized
- `before_login` - User not logged in
- `login` - User logged in
- `login_before_register` - User logged in but not registered in WePin

You can check the current status:

```typescript
const status = await wallet.getStatus();
```

## Event Handling

```typescript
// Listen for account changes
wallet.on('accountChanged', (account) => {
  console.log('Account changed:', account);
});

// Listen for lifecycle changes
wallet.on('lifecycleChanged', (lifecycle) => {
  console.log('Lifecycle changed:', lifecycle);
});

// Listen for widget events
wallet.on('widgetOpened', () => {
  console.log('Widget opened');
});

wallet.on('widgetClosed', () => {
  console.log('Widget closed');
});

// Listen for errors
wallet.on('error', (error) => {
  console.error('WePin error:', error);
});
```

## Widget Control

```typescript
// Open widget manually
await wallet.openWidget();

// Close widget
wallet.closeWidget();

// Change language/currency
wallet.changeLanguage('en', 'USD');
```

## Multiple Accounts

```typescript
// Get all accounts
const accounts = await wallet.getAccounts();

// Filter by network
const veryAccounts = await wallet.getAccounts();
const veryAccount = veryAccounts.find(acc => acc.network === 'very');
```

## Error Handling

All methods include proper error handling:

```typescript
try {
  await wallet.connect();
} catch (error) {
  if (error instanceof Error) {
    console.error('Connection failed:', error.message);
  }
}
```

## Cleanup

Always cleanup when done:

```typescript
// In React component
useEffect(() => {
  return () => {
    wallet.finalize();
  };
}, []);
```

## Migration Notes

### Breaking Changes

1. **Initialization API Changed**
   - Old: `wallet.initialize(appId, appKey)`
   - New: `wallet.initialize({ appId, appKey, attributes })`

2. **Connection Options**
   - Old: `wallet.connect()`
   - New: `wallet.connect(options?)` - now supports options

3. **Provider Access**
   - Old: `wallet.getProvider()` (no network parameter)
   - New: `wallet.getProvider(network?)` (optional network parameter)

### Non-Breaking Improvements

- All existing code continues to work
- New features are additive
- Better error messages
- More detailed TypeScript types

## Best Practices

1. **Always initialize before connecting**
   ```typescript
   await wallet.initialize({ appId, appKey });
   await wallet.connect();
   ```

2. **Handle errors gracefully**
   ```typescript
   try {
     await wallet.connect();
   } catch (error) {
     // Show user-friendly error message
   }
   ```

3. **Clean up on unmount**
   ```typescript
   useEffect(() => {
     return () => wallet.finalize();
   }, []);
   ```

4. **Use event listeners for state changes**
   ```typescript
   wallet.on('accountChanged', handleAccountChange);
   ```

5. **Check status before operations**
   ```typescript
   const status = await wallet.getStatus();
   if (status === 'login') {
     // Safe to proceed
   }
   ```

## Environment Variables

Make sure to set these in your `.env` file:

```env
VITE_WEPIN_APP_ID=your_app_id
VITE_WEPIN_APP_KEY=your_app_key
```

## References

- [WePin Documentation](https://docs.wepin.io/en)
- [WePin SDK GitHub](https://github.com/WepinWallet/wepin-web-sdk-v1)
- [EIP-1193 Provider Standard](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-191 Message Signing](https://eips.ethereum.org/EIPS/eip-191)

## Testing

To test the integration:

1. Set up environment variables
2. Register your app in WePin Workspace
3. Initialize the wallet
4. Test connection flow
5. Test transaction signing
6. Test message signing

## Support

For issues or questions:
- Check the [WePin Documentation](https://docs.wepin.io/en)
- Review error messages in console
- Check network tab for API calls
- Verify environment variables are set correctly

