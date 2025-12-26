# VERY Token Web3 Integration

This document describes the web3 integration for the VERY token in the VeryTippers application.

## Overview

The VERY token web3 integration provides comprehensive ERC-20 token operations including:
- Token transfers
- Token approvals
- Allowance checking
- Balance queries
- Token information retrieval

## Architecture

### Core Services

#### 1. `veryToken.ts` - Core Token Service
Location: `client/src/lib/web3/veryToken.ts`

Provides low-level functions for interacting with the VERY token contract:

- **`getVeryTokenContract(signerOrProvider)`** - Gets the VERY token contract instance
- **`getVeryTokenInfo()`** - Retrieves token metadata (name, symbol, decimals, total supply)
- **`transferVeryTokens(to, amount, signer)`** - Transfers VERY tokens directly
- **`approveVeryTokens(spender, amount, signer)`** - Approves tokens for a spender
- **`getVeryTokenAllowance(owner, spender)`** - Gets the allowance for a spender
- **`hasEnoughAllowance(owner, spender, requiredAmount)`** - Checks if allowance is sufficient
- **`transferFromVeryTokens(from, to, amount, signer)`** - Transfers tokens on behalf of another address

### React Hooks

#### 2. `useVeryToken` Hook
Location: `client/src/hooks/useVeryToken.ts`

A React hook that provides easy access to VERY token operations:

```typescript
const {
  tokenInfo,        // Token metadata
  balance,          // Current balance
  isLoading,       // Loading state
  error,           // Error state
  transfer,        // Transfer function
  approve,         // Approve function
  getAllowance,    // Get allowance function
  checkAllowance,  // Check allowance function
  refreshBalance   // Refresh balance function
} = useVeryToken();
```

### Context Integration

#### 3. `WalletContext` Enhancement
Location: `client/src/contexts/WalletContext.tsx`

The WalletContext now includes VERY token operations:

```typescript
const {
  veryTokenInfo,              // Token information
  veryTokenBalance,          // Current balance
  transferVeryToken,          // Transfer function
  approveVeryToken,           // Approve function
  getVeryTokenAllowanceFor,   // Get allowance function
  checkVeryTokenAllowance,    // Check allowance function
  refreshVeryTokenBalance     // Refresh balance function
} = useWallet();
```

## Usage Examples

### Basic Transfer

```typescript
import { useVeryToken } from '@/hooks/useVeryToken';

function MyComponent() {
  const { transfer, balance } = useVeryToken();

  const handleTransfer = async () => {
    const result = await transfer('0xRecipientAddress...', 100);
    
    if (result.success) {
      console.log('Transfer successful!', result.transactionHash);
    } else {
      console.error('Transfer failed:', result.error);
    }
  };

  return (
    <div>
      <p>Balance: {balance?.formatted} VERY</p>
      <button onClick={handleTransfer}>Transfer 100 VERY</button>
    </div>
  );
}
```

### Approve for Contract Interaction

```typescript
import { useVeryToken } from '@/hooks/useVeryToken';
import { CONTRACTS } from '@/lib/web3/config';

function MyComponent() {
  const { approve, checkAllowance } = useVeryToken();

  const handleApprove = async () => {
    // Approve maximum tokens for the tip router contract
    const result = await approve(CONTRACTS.tipRouter.address, 'max');
    
    if (result.success) {
      console.log('Approval successful!', result.transactionHash);
    }
  };

  const checkIfApproved = async () => {
    const hasEnough = await checkAllowance(
      CONTRACTS.tipRouter.address,
      100 // Required amount
    );
    
    if (!hasEnough) {
      // Prompt user to approve
      await handleApprove();
    }
  };

  return (
    <button onClick={handleApprove}>
      Approve VERY Tokens
    </button>
  );
}
```

### Using WalletContext

```typescript
import { useWallet } from '@/contexts/WalletContext';

function MyComponent() {
  const {
    isConnected,
    veryTokenBalance,
    transferVeryToken,
    approveVeryToken
  } = useWallet();

  if (!isConnected) {
    return <div>Please connect your wallet</div>;
  }

  return (
    <div>
      <p>Balance: {veryTokenBalance?.formatted} VERY</p>
      <button onClick={() => transferVeryToken('0x...', 50)}>
        Transfer 50 VERY
      </button>
    </div>
  );
}
```

## Component Example

A complete example component is available at:
`client/src/components/VeryTokenOperations.tsx`

This component demonstrates:
- Displaying token information
- Showing current balance
- Transferring tokens
- Approving tokens
- Checking allowances

## Configuration

Token contract address is configured in:
- `client/src/lib/web3/config.ts` - `CONTRACTS.veryToken.address`
- Environment variable: `VITE_VERY_TOKEN_ADDRESS`

## Error Handling

All functions return result objects with success/error information:

```typescript
interface TransferResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

interface ApproveResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}
```

Common errors:
- `'Wallet not connected'` - User needs to connect wallet
- `'Invalid recipient address'` - Invalid Ethereum address
- `'Insufficient balance'` - Not enough tokens
- `'Transaction rejected by user'` - User rejected in wallet
- `'Invalid amount'` - Amount must be positive

## Network Requirements

All operations automatically ensure the wallet is connected to VERY Chain:
- Chain ID: 4613 (Testnet)
- Network switching is handled automatically
- Falls back gracefully if network switch fails

## Integration with Existing Features

The VERY token integration works seamlessly with:
- **Tip System**: Approve tokens for the tip router contract
- **Balance Display**: Shows VERY token balance in wallet UI
- **Gas Sponsorship**: Can be used with gasless transactions
- **Event Listening**: Transfer events are tracked

## Best Practices

1. **Always check balance before transfer**:
   ```typescript
   if (balance && parseFloat(balance.formatted) < amount) {
     // Show error
     return;
   }
   ```

2. **Use allowance checks before contract interactions**:
   ```typescript
   const hasEnough = await checkAllowance(spender, amount);
   if (!hasEnough) {
     await approve(spender, amount);
   }
   ```

3. **Handle user rejections gracefully**:
   ```typescript
   const result = await transfer(to, amount);
   if (!result.success && result.error?.includes('reject')) {
     // User rejected, don't show error
     return;
   }
   ```

4. **Refresh balance after operations**:
   ```typescript
   const result = await transfer(to, amount);
   if (result.success) {
     await refreshBalance();
   }
   ```

## Testing

The implementation includes:
- Mock mode support (when `VITE_ENABLE_MOCK_MODE=true`)
- Error handling for network failures
- Timeout protection for RPC calls
- User-friendly error messages

## Future Enhancements

Potential improvements:
- Batch transfers
- Token swap integration
- Staking functionality
- Multi-signature support
- Token vesting schedules

