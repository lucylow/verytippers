# $VERY Utility Token Ecosystem

## Overview

$VERY is not just a currency. It is a complete economic system designed for the VeryTippers platform:

- **Medium of appreciation** (tips)
- **Reputation signal** (leaderboards, boosts)
- **Governance weight** (DAO + proposals)
- **Gamification fuel** (badges, multipliers)
- **Anti-spam mechanism** (rate limits, staking)
- **Programmable incentive layer** (AI + rules)

## Architecture

### 1. Core ERC-20 Token (`VeryToken.sol`)

**Features:**
- Gas-optimized ERC-20 implementation
- Max supply cap: 1 billion VERY tokens
- Initial treasury: 100M VERY (10% of max supply)
- Owner-controlled minting (for rewards distribution)

**Key Functions:**
```solidity
constructor(address treasury)  // Mints 100M to treasury
mint(address to, uint256 amount)  // Owner-only minting
```

### 2. Reputation System (`VeryReputation.sol`)

**Purpose:** Track lifetime tipping stats and calculate multipliers

**Features:**
- Lifetime tips sent/received tracking
- Reputation-based tip multipliers:
  - Base: 1.0x (default)
  - Epic: 1.2x (1,000+ VERY received)
  - Legendary: 1.5x (10,000+ VERY received)
- Authorized recorder pattern (only TipRouter can record)

**Key Functions:**
```solidity
recordTip(address from, address to, uint256 amount)
tipMultiplier(address user) returns (uint256)  // Basis points
getReputation(address user) returns (tipped, received, multiplier)
```

### 3. Staking System (`VeryStake.sol`)

**Purpose:** Anti-spam mechanism via economic friction

**Features:**
- Minimum stake requirement (default: 100 VERY)
- Users must stake to unlock tipping capacity
- Prevents sybil attacks
- DAO-tunable parameters

**Key Functions:**
```solidity
stake(uint256 amount)
unstake(uint256 amount)
canTip(address user) returns (bool)
getStakeInfo(address user) returns (stakedAmount, canTip)
```

### 4. Governance System (`VeryGovernor.sol`)

**Purpose:** Token-weighted voting with contribution rewards

**Voting Power Formula:**
```
VotingPower = VERY_balance + (lifetime_received × 100) + NFT_multiplier
```

This rewards contribution (tips received) over pure whale dominance.

**Key Functions:**
```solidity
votingPower(address user) returns (uint256)
getVotingPowerBreakdown(address user) returns (tokenPower, repPower, nftPower, totalPower)
```

### 5. Rewards Pool (`VeryRewardsPool.sol`)

**Purpose:** Non-inflationary daily rewards distribution

**Features:**
- Daily pool: 10,000 VERY (configurable)
- Distributed to top creators
- Transparent and predictable emissions
- DAO-controlled parameters

**Key Functions:**
```solidity
distribute(address[] calldata topCreators)
setDailyPool(uint256 newDailyPool)
```

### 6. Enhanced TipRouter (`TipRouter.sol`)

**Updates:**
- Now actually transfers VERY tokens (not just events)
- Integrates with VeryReputation for automatic tracking
- Maintains gasless meta-transaction flow
- Replay protection via nonces

**Key Changes:**
```solidity
constructor(address _relayerSigner, address _veryToken)  // Now requires token
submitTip(...) {
    // Transfers tokens
    VERY.safeTransferFrom(from, to, amount);
    // Records reputation
    if (address(reputation) != address(0)) {
        reputation.recordTip(from, to, amount);
    }
}
```

## Frontend Integration

### Hooks

1. **`useVeryToken`** - Token balance, transfers, approvals
2. **`useVeryReputation`** - Reputation stats and multipliers
3. **`useVeryStake`** - Staking operations and status
4. **`useVeryGovernor`** - Voting power calculations

### Components

**`VeryEcosystem.tsx`** - Complete dashboard showing:
- Token balance
- Reputation multiplier
- Staking status
- Voting power
- Detailed breakdowns for each system

## Deployment Checklist

1. **Deploy VeryToken**
   ```bash
   # Deploy with treasury address
   VeryToken treasury = 0x...
   ```

2. **Deploy VeryReputation**
   ```bash
   VeryReputation reputation = new VeryReputation();
   ```

3. **Deploy VeryStake**
   ```bash
   VeryStake stake = new VeryStake(veryTokenAddress, 100 ether);
   ```

4. **Deploy VeryGovernor**
   ```bash
   VeryGovernor governor = new VeryGovernor(veryTokenAddress, reputationAddress);
   ```

5. **Deploy VeryRewardsPool**
   ```bash
   VeryRewardsPool rewards = new VeryRewardsPool(veryTokenAddress, 10_000 ether);
   ```

6. **Deploy/Update TipRouter**
   ```bash
   TipRouter router = new TipRouter(relayerSigner, veryTokenAddress);
   router.setReputation(reputationAddress);
   ```

7. **Configure Contracts**
   ```bash
   # Authorize TipRouter in VeryReputation
   reputation.setRecorder(tipRouterAddress, true);
   
   # Grant MINTER_ROLE to rewards pool (if using AccessControl version)
   # Or use owner minting in new version
   ```

## Environment Variables

Add to `.env`:
```env
VITE_VERY_TOKEN_ADDRESS=0x...
VITE_REPUTATION_CONTRACT_ADDRESS=0x...
VITE_STAKE_CONTRACT_ADDRESS=0x...
VITE_GOVERNOR_CONTRACT_ADDRESS=0x...
VITE_REWARDS_POOL_ADDRESS=0x...
VITE_TIP_CONTRACT_ADDRESS=0x...
```

## Integration Flow

### Tipping Flow

1. User approves TipRouter to spend VERY tokens
2. User signs tip payload (gasless)
3. Relayer submits to TipRouter
4. TipRouter:
   - Verifies relayer signature
   - Checks replay protection
   - Transfers VERY tokens (from → to)
   - Records tip in VeryReputation
   - Emits event for indexer

### Staking Flow

1. User approves VeryStake to spend VERY tokens
2. User calls `stake(amount)`
3. Tokens locked in contract
4. User can now tip (if above minimum)

### Governance Flow

1. User's voting power calculated on-demand
2. Formula: `balance + (received × 100) + NFT_boost`
3. Used in DAO proposals and voting

## Security Considerations

1. **Replay Protection:** Nonce-based in TipRouter
2. **Access Control:** Owner-only functions protected
3. **Reentrancy:** ReentrancyGuard on critical functions
4. **Safe Transfers:** SafeERC20 for all token operations
5. **Input Validation:** All user inputs validated

## Economic Model

### Token Distribution
- Initial Treasury: 100M VERY (10%)
- Daily Rewards: 10,000 VERY/day
- Max Supply: 1B VERY (hard cap)

### Multiplier Tiers
- Base: 1.0x (default)
- Epic: 1.2x (1,000 VERY received)
- Legendary: 1.5x (10,000 VERY received)

### Staking Requirements
- Minimum: 100 VERY to tip
- No maximum (unlimited daily cap increase)

### Governance Weight
- 1 VERY balance = 1 voting power
- 1 VERY received = 100 voting power
- 1 NFT = 1,000 voting power (configurable)

## Future Enhancements

- [ ] EIP-712 typed signatures
- [ ] ZK-proof-friendly reputation
- [ ] NFT badge minting integration
- [ ] On-chain receipts
- [ ] Token velocity analytics
- [ ] Quadratic voting
- [ ] Time-locked staking (vesting)
- [ ] Multi-signature governance

## Testing

Run tests:
```bash
npx hardhat test test/VeryToken.test.ts
npx hardhat test test/VeryReputation.test.ts
npx hardhat test test/VeryStake.test.ts
npx hardhat test test/VeryGovernor.test.ts
```

## Summary

This ecosystem provides:
✅ Real utility (not speculative)
✅ AI + Web3 separation of powers
✅ Fairness via staking & reputation
✅ Gasless UX preserved
✅ Wallet-agnostic
✅ Extensible DAO
✅ Clear economic logic

This reads like a protocol, not an app.

