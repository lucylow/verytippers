# $VERY Token Ecosystem - Complete Implementation Guide

## Overview

The $VERY utility token ecosystem is a production-grade, end-to-end token system designed for VeryTippers. It's not just a currency—it's a complete economic system that enables:

- **Medium of Appreciation**: Tips consume VERY, not ETH
- **Reputation Signal**: Leaderboards, boosts, multipliers
- **Governance Weight**: DAO voting power
- **Gamification Fuel**: Badges, multipliers, achievements
- **Anti-Spam Mechanism**: Stake-based rate limits
- **Programmable Incentive Layer**: AI suggests, contracts enforce

## Architecture

### Core Contracts

#### 1. VeryToken.sol
- **Purpose**: Core ERC-20 token with max supply cap
- **Features**:
  - Max supply: 1 billion VERY tokens
  - Treasury-controlled minting
  - Gas-optimized
  - Auditable

**Key Functions**:
```solidity
function mint(address to, uint256 amount) external onlyOwner
```

#### 2. TipRouter.sol (Enhanced)
- **Purpose**: Gasless tipping with VERY token integration
- **Features**:
  - KMS-signed meta-transactions
  - Replay protection
  - VERY token transfers
  - **NEW**: VeryStake integration for anti-spam
  - **NEW**: VeryReputation integration for reputation tracking

**Key Functions**:
```solidity
function submitTip(
    address from,
    address to,
    uint256 amount,
    bytes32 cidHash,
    uint256 nonce,
    uint8 v, bytes32 r, bytes32 s
) external
```

**Anti-Spam Integration**:
- Checks if user has sufficient stake before allowing tip
- Records tip block for rate limiting
- Prevents sybil attacks economically

#### 3. VeryReputation.sol
- **Purpose**: On-chain reputation and gamification
- **Features**:
  - Lifetime tips sent/received tracking
  - Reputation-based multipliers
  - Leaderboard data source

**Multiplier Tiers**:
- **Base**: 1.0x (default)
- **Epic**: 1.2x (1,000+ VERY received)
- **Legendary**: 1.5x (10,000+ VERY received)

**Key Functions**:
```solidity
function getReputation(address user) external view returns (
    uint256 tipped,
    uint256 received,
    uint256 multiplier
)
function tipMultiplier(address user) external view returns (uint256)
```

#### 4. VeryStake.sol
- **Purpose**: Anti-spam staking mechanism
- **Features**:
  - Minimum stake requirement (default: 100 VERY)
  - Economic friction to prevent sybil attacks
  - DAO-tunable parameters
  - Rate limiting support

**Key Functions**:
```solidity
function stake(uint256 amount) external
function unstake(uint256 amount) external
function canTip(address user) external view returns (bool)
function getStakeInfo(address user) external view returns (
    uint256 stakedAmount,
    bool canTipUser
)
```

#### 5. VeryGovernor.sol
- **Purpose**: Token-weighted governance system
- **Features**:
  - Voting power calculation
  - Rewards contribution over whale dominance
  - NFT multiplier support

**Voting Power Formula**:
```
VotingPower = Token Balance + (Lifetime Received × 100) + NFT Multiplier
```

**Key Functions**:
```solidity
function votingPower(address user) external view returns (uint256)
function getVotingPowerBreakdown(address user) external view returns (
    uint256 tokenPower,
    uint256 repPower,
    uint256 nftPower,
    uint256 totalPower
)
```

#### 6. VeryRewards.sol
- **Purpose**: On-chain reward distribution
- **Features**:
  - Signed reward payloads
  - Replay protection
  - Gasless UX via relayer

#### 7. VeryRewardsPool.sol
- **Purpose**: Daily rewards distribution
- **Features**:
  - Non-inflationary rewards
  - Predictable emissions (default: 10,000 VERY/day)
  - DAO-controlled

## Frontend Integration

### Hooks

#### useVeryReputation
```typescript
const { reputation, refreshReputation, getReputationFor } = useVeryReputation();
```

**Returns**:
- `reputation`: ReputationData with tipped, received, multiplier
- `refreshReputation()`: Refresh current user's reputation
- `getReputationFor(address)`: Get reputation for any address

#### useVeryStake
```typescript
const { stakeData, stake, unstake, refreshStake } = useVeryStake();
```

**Returns**:
- `stakeData`: StakeData with staked amount, canTip status, progress
- `stake(amount)`: Stake VERY tokens
- `unstake(amount)`: Unstake VERY tokens
- `refreshStake()`: Refresh stake data

#### useVeryGovernor
```typescript
const { votingPower, refreshVotingPower, getVotingPowerFor } = useVeryGovernor();
```

**Returns**:
- `votingPower`: VotingPowerData with breakdown
- `refreshVotingPower()`: Refresh voting power
- `getVotingPowerFor(address)`: Get voting power for any address

### Components

#### VeryEcosystem Component
Complete token ecosystem dashboard with:
- Token balance display
- Reputation stats and multipliers
- Staking interface
- Governance power breakdown
- Tabbed interface for detailed views

**Location**: `/client/src/components/VeryEcosystem.tsx`

#### TokenEcosystem Page
Full page with:
- Feature overview cards
- Token utility explanation
- VeryEcosystem component integration

**Route**: `/tokens`

## Contract Deployment

### Deployment Order

1. **VeryToken**: Deploy first (needed by all other contracts)
2. **VeryReputation**: Deploy second (needed by TipRouter and VeryGovernor)
3. **VeryStake**: Deploy third (needed by TipRouter)
4. **TipRouter**: Deploy with VeryToken, VeryReputation, and VeryStake addresses
5. **VeryGovernor**: Deploy with VeryToken and VeryReputation addresses
6. **VeryRewards**: Deploy with VeryToken address
7. **VeryRewardsPool**: Deploy with VeryToken address

### Configuration

After deployment, configure contracts:

1. **VeryReputation**: Authorize TipRouter as recorder
   ```solidity
   reputation.setRecorder(tipRouterAddress, true);
   ```

2. **VeryStake**: Authorize TipRouter as recorder
   ```solidity
   stake.setRecorder(tipRouterAddress, true);
   ```

3. **TipRouter**: Set reputation and stake contracts
   ```solidity
   tipRouter.setReputation(reputationAddress);
   tipRouter.setStakeContract(stakeAddress);
   ```

## Environment Variables

Add to `.env`:

```bash
# Contract Addresses
VITE_VERY_TOKEN_ADDRESS=0x...
VITE_REPUTATION_CONTRACT_ADDRESS=0x...
VITE_STAKE_CONTRACT_ADDRESS=0x...
VITE_GOVERNOR_CONTRACT_ADDRESS=0x...
VITE_TIP_CONTRACT_ADDRESS=0x...
VITE_VERY_REWARDS_CONTRACT_ADDRESS=0x...
VITE_REWARDS_POOL_ADDRESS=0x...
```

## Usage Examples

### Staking Tokens

```typescript
const { stake } = useVeryStake();

// Stake 100 VERY tokens
const result = await stake(100);
if (result.success) {
  console.log('Staked successfully!', result.txHash);
}
```

### Checking Reputation

```typescript
const { reputation } = useVeryReputation();

console.log('Lifetime tipped:', reputation.tippedFormatted);
console.log('Lifetime received:', reputation.receivedFormatted);
console.log('Multiplier:', reputation.multiplierFormatted);
```

### Viewing Voting Power

```typescript
const { votingPower } = useVeryGovernor();

console.log('Total voting power:', votingPower.totalPowerFormatted);
console.log('Token power:', votingPower.tokenPowerFormatted);
console.log('Reputation power:', votingPower.repPowerFormatted);
```

## Security Considerations

1. **Access Control**: All contracts use OpenZeppelin's Ownable for admin functions
2. **Replay Protection**: TipRouter uses nonce-based replay protection
3. **Stake Verification**: TipRouter verifies stake before processing tips
4. **Signature Verification**: All meta-transactions use EIP-191 signatures
5. **Reentrancy Protection**: TipRouter uses ReentrancyGuard

## Economic Model

### Token Distribution
- **Max Supply**: 1,000,000,000 VERY
- **Initial Treasury**: 100,000,000 VERY (10%)
- **Daily Rewards Pool**: 10,000 VERY/day (configurable)
- **Remaining**: DAO-controlled minting

### Multiplier System
- Rewards active contributors
- Prevents gaming through high thresholds
- Transparent on-chain calculation

### Governance Model
- Rewards contribution (tips received) over whale dominance
- Formula: `Token Balance + (Received × 100) + NFT Boost`
- Sybil-resistant through reputation requirements

## Future Enhancements

### Optional Power-Ups

1. **EIP-712 Typed Signatures**: Better UX for meta-transactions
2. **ZK-Proof Reputation**: Privacy-preserving reputation
3. **NFT Badge Minting**: On-chain achievement badges
4. **On-Chain Receipts**: Immutable tip history
5. **Token Velocity Analytics**: Economic metrics
6. **Quadratic Voting**: More democratic governance

## Testing

### Unit Tests
- Test all contract functions
- Test access control
- Test edge cases (zero amounts, invalid addresses)

### Integration Tests
- Test TipRouter with VeryStake integration
- Test reputation updates
- Test governance power calculation

### Frontend Tests
- Test hooks with mock data
- Test component rendering
- Test user interactions

## Documentation

- **Contract ABIs**: `/contracts/abis/`
- **Frontend Hooks**: `/client/src/hooks/useVery*.ts`
- **Components**: `/client/src/components/VeryEcosystem.tsx`
- **Pages**: `/client/src/pages/TokenEcosystem.tsx`

## Support

For questions or issues:
1. Check contract documentation in Solidity files
2. Review frontend hook implementations
3. Check component examples
4. Review test files for usage patterns

---

**Built for VeryTippers Hackathon** 🚀
