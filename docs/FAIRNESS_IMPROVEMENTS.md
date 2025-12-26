# TipRouterFair - Fairness Improvements

This document describes the fairness enhancements added to VeryTippers through the `TipRouterFair` contract.

## Overview

`TipRouterFair` is an enhanced version of `TipRouter` that adds comprehensive fairness controls to prevent abuse while maintaining the gasless meta-transaction flow. It enforces:

- **Per-transaction caps**: Maximum tip amount per transaction
- **Daily caps**: Maximum total tips per user per day (with stake-based increases)
- **Rate limiting**: Minimum time interval between tips
- **Anti-self-tip**: Prevents users from tipping themselves
- **Blacklist**: Admin-controlled address blocking
- **Stake-based allowances**: Users can stake tokens to increase their daily caps

## Contract Features

### Fairness Controls

1. **Per-Tx Cap** (`maxTipAmount`): Default 10 VERY per transaction
2. **Daily Cap** (`baseDailyCap`): Default 50 VERY per day (base)
3. **Minimum Interval** (`minIntervalSec`): Default 30 seconds between tips
4. **Stake Multiplier**: Each staked token increases daily cap by multiplier (default 1:1)

### Staking System

Users can stake ERC20 tokens (VERY) to increase their daily tipping allowance:

```solidity
// Stake 100 VERY tokens
tipRouter.stake(100 ether);

// Daily cap increases by: baseDailyCap + (stakeBalance * stakeMultiplier)
// Example: 50 + (100 * 1) = 150 VERY per day
```

**Unstaking Process:**
1. Call `initiateUnstake(amount)` - tokens are locked
2. Wait for `unstakeDelay` (default 1 day)
3. Call `withdrawUnstaked(amount)` to receive tokens

This delay prevents flash manipulation of staking for immediate cap increases.

### Admin Functions

All parameters are tunable by the contract owner:

```solidity
// Update fairness parameters
setCaps(minInterval, maxTipAmount, baseDailyCap, stakeMultiplier)

// Update unstake delay
setUnstakeDelay(delayInSeconds)

// Blacklist/unblacklist addresses
setBlacklist(address, true/false)

// Update relayer signer
setRelayerSigner(newSigner)
```

## Deployment

### Prerequisites

1. Deploy or have address of ERC20 token (VERY token)
2. Have relayer signer address (KMS-derived or wallet)

### Deployment Script

```bash
# Deploy TipRouterFair
npx hardhat run scripts/deploy-tiprouter-fair.ts --network verychain
```

Example deployment:

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const relayerSigner = process.env.RELAYER_SIGNER_ADDRESS;
  const veryTokenAddress = process.env.VERY_TOKEN_ADDRESS;

  const TipRouterFair = await ethers.getContractFactory("TipRouterFair");
  const tipRouter = await TipRouterFair.deploy(relayerSigner, veryTokenAddress);
  
  await tipRouter.waitForDeployment();
  console.log("TipRouterFair deployed to:", await tipRouter.getAddress());
}
```

## Integration

### 1. Update Relayer

The relayer automatically uses fairness checks if `TipRouterFair` is deployed. The check happens before submitting to save gas:

```typescript
// relayer/src/relayer-worker.ts
import { canSubmitTip } from './fairness-check';

// Pre-check before submission
const check = await canSubmitTip(provider, contractAddress, from, to, amount);
if (!check.ok) {
  // Reject early, save gas
  return { error: check.reason };
}
```

### 2. Frontend Integration

Query user's daily spending info:

```typescript
import { getDailySpendingInfo } from './fairness-check';

const info = await getDailySpendingInfo(provider, contractAddress, userAddress);
console.log(`Spent today: ${info.spentToday}`);
console.log(`Daily cap: ${info.dailyCap}`);
console.log(`Remaining: ${info.remaining}`);
console.log(`Time until next tip: ${info.timeUntilNextTip}s`);
```

### 3. Off-Chain Validation

Use the fairness check utility before queueing tips:

```typescript
// backend/src/services/tip-service.ts
import { canSubmitTip } from '../../relayer/src/fairness-check';

async function validateTip(from: string, to: string, amount: bigint) {
  const result = await canSubmitTip(provider, tipRouterAddress, from, to, amount);
  
  if (!result.ok) {
    throw new Error(`Tip validation failed: ${result.reason}`);
  }
  
  return result;
}
```

## Testing

Run the test suite:

```bash
npx hardhat test test/TipRouterFair.test.ts
```

Test coverage includes:
- ✅ Per-tx cap enforcement
- ✅ Daily cap enforcement
- ✅ Rate limiting (minimum interval)
- ✅ Self-tip prevention
- ✅ Blacklist enforcement
- ✅ Staking and unstaking
- ✅ Stake-based cap increases
- ✅ Admin parameter updates

## Migration from TipRouter

### Option 1: Deploy New Contract

1. Deploy `TipRouterFair` with same relayer signer
2. Update all references to new contract address
3. Migrate any pending tips from old contract

### Option 2: Upgrade Pattern (Future)

For production, consider using a proxy pattern (UUPS/Transparent) to allow upgrades while maintaining the same address.

## Configuration Examples

### Conservative (Strict)

```solidity
setCaps(
  60,              // 1 minute between tips
  ethers.parseEther("5"),   // 5 VERY per tx
  ethers.parseEther("25"),  // 25 VERY per day
  0.5              // 0.5x multiplier (2 VERY staked = +1 VERY cap)
);
```

### Moderate (Default)

```solidity
setCaps(
  30,              // 30 seconds between tips
  ethers.parseEther("10"),  // 10 VERY per tx
  ethers.parseEther("50"),  // 50 VERY per day
  1                // 1x multiplier (1 VERY staked = +1 VERY cap)
);
```

### Permissive (High Limits)

```solidity
setCaps(
  10,              // 10 seconds between tips
  ethers.parseEther("50"),  // 50 VERY per tx
  ethers.parseEther("200"), // 200 VERY per day
  2                // 2x multiplier (1 VERY staked = +2 VERY cap)
);
```

## Security Considerations

1. **On-chain checks are authoritative**: Off-chain checks save gas but can be bypassed by malicious relayers. Always enforce on-chain.

2. **Staking centralization**: Staking increases caps, which could favor whales. Consider:
   - Capping maximum stake bonus
   - Using separate staking contract with rewards
   - Implementing progressive multipliers

3. **Blacklist abuse**: Admin can blacklist any address. Use multisig for production.

4. **Unstake delay**: Prevents flash manipulation but locks user funds. Consider:
   - Shorter delays for smaller amounts
   - Partial unstaking
   - Emergency withdrawal (with longer delay)

## Events

All fairness events are emitted for off-chain indexing:

```solidity
event TipSubmitted(bytes32 indexed cidHash, address indexed from, address indexed to, uint256 amount, bytes32 msgHash, bytes relayerSig);
event Staked(address indexed user, uint256 amount);
event UnstakeInitiated(address indexed user, uint256 amount, uint256 releaseTime);
event Unstaked(address indexed user, uint256 amount);
event BlacklistUpdated(address indexed who, bool blocked);
event ParamsUpdated(string param);
```

## API Reference

### View Functions

- `effectiveDailyCap(address user)`: Get user's effective daily cap
- `currentDay()`: Get current day index
- `dailySpent(address user, uint256 day)`: Get spending for specific day
- `stakeBalance(address user)`: Get user's staked amount
- `getMessageHash(...)`: Get message hash for signing

### User Functions

- `stake(uint256 amount)`: Stake tokens to increase daily cap
- `initiateUnstake(uint256 amount)`: Start unstaking process
- `withdrawUnstaked(uint256 amount)`: Withdraw after delay

### Admin Functions

- `setCaps(...)`: Update fairness parameters
- `setBlacklist(address, bool)`: Manage blacklist
- `setRelayerSigner(address)`: Update relayer signer
- `setUnstakeDelay(uint256)`: Update unstake delay

## Troubleshooting

### "Daily cap exceeded"

- Check current spending: `dailySpent(user, currentDay())`
- Check effective cap: `effectiveDailyCap(user)`
- Consider staking to increase cap

### "Rate limited"

- Check last tip time: `lastTipAt(user)`
- Wait for minimum interval: `minIntervalSec()`

### "Blacklisted"

- Contact admin to check blacklist status
- Admin can remove: `setBlacklist(user, false)`

## Future Enhancements

Potential improvements:

1. **Merkle allowlist**: Only verified creators can receive > X amounts
2. **Batch settlement**: Settle multiple tips in one tx
3. **Transfer integration**: Make `submitTip` atomically transfer tokens
4. **Progressive caps**: Different caps based on user reputation
5. **Time-based caps**: Hourly/weekly caps in addition to daily

