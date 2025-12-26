# $VERY Token Rewards Implementation

Complete implementation of $VERY token rewards system for VeryTippers, designed for production use with hackathon-ready code.

## Overview

The $VERY token rewards system rewards users for real actions like sending tips, receiving tips, creating quality content, maintaining streaks, referrals, and DAO participation. The system uses on-chain validation with off-chain policy enforcement for flexibility and gas efficiency.

## Architecture

```
User Action (Tip Sent, Content Created, etc.)
   ↓
Backend / RewardService (Policy Engine)
   ↓ (evaluate eligibility + sign)
RewardSigner (KMS/HSM)
   ↓ (signed reward payload)
VeryRewards.sol (on-chain)
   ↓
$VERY ERC20 Mint / Transfer
   ↓
Indexer → UI / Leaderboards
```

## Smart Contracts

### VeryToken.sol
- ERC20 token with `MINTER_ROLE`
- Only VeryRewards contract can mint
- DAO can later govern mint caps
- Simple, audit-friendly implementation

### VeryRewards.sol
- Validates signed reward payloads
- Replay protection via `rewardUsed` mapping
- EIP-191 signature verification
- Mints tokens to users via VeryToken

## Backend Services

### RewardService (`server/services/RewardService.ts`)
- Evaluates reward eligibility based on action type and context
- Signs reward payloads using reward signer private key
- Implements reward policy matrix (amounts per action type)
- Validates on-chain reward claim status

### API Routes (`server/routes/rewards.ts`)

#### POST `/api/rewards/issue`
Issue a reward by evaluating eligibility and signing payload.

**Request:**
```json
{
  "user": "0x...",
  "actionType": "TIP_SENT",
  "context": {
    "tipAmount": 1.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": "0x...",
    "amount": "5000000000000000000",
    "reason": "TIP_SENT",
    "nonce": 1234567890,
    "signature": "0x...",
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  }
}
```

#### GET `/api/rewards/evaluate`
Check if an action is eligible for reward without issuing.

#### GET `/api/rewards/info`
Get contract information and signer address.

#### GET `/api/rewards/table`
Get reward table showing amounts per action type.

## Reward Policy Matrix

| Action | Condition | $VERY Award |
|--------|-----------|-------------|
| Tip Sent | ≥ $1 equivalent | 5 VERY |
| Tip Received | any | 3 VERY |
| Quality Content | score ≥ 0.8 | 20 VERY |
| Daily Streak | 7 days | 15 VERY |
| Referral | verified | 25 VERY |
| DAO Vote | once per proposal | 10 VERY |

## Frontend Integration

### Hook: `useRewards()`

```typescript
import { useRewards, RewardActionType } from '@/hooks/useRewards';

function MyComponent() {
  const { issueReward, claimRewardOnChain, isClaiming } = useRewards();

  const handleTipSent = async () => {
    // Issue reward from backend
    const payload = await issueReward(RewardActionType.TIP_SENT, {
      tipAmount: 2.5
    });

    if (payload) {
      // Claim on-chain
      const result = await claimRewardOnChain(payload);
      if (result.success) {
        console.log('Reward claimed!', result.transactionHash);
      }
    }
  };

  return (
    <button onClick={handleTipSent} disabled={isClaiming}>
      {isClaiming ? 'Claiming...' : 'Claim Reward'}
    </button>
  );
}
```

## Deployment

### 1. Deploy Contracts

```bash
# Set environment variables
export REWARD_SIGNER=0xYourKMSDerivedAddress
export PRIVATE_KEY=0xYourDeployerKey

# Deploy to testnet
npx hardhat run scripts/deploy-very-rewards.ts --network veryTestnet

# Deploy to mainnet
npx hardhat run scripts/deploy-very-rewards.ts --network verychain
```

### 2. Update Environment Variables

**Backend (.env):**
```bash
VERY_TOKEN_ADDRESS=0x...
VERY_REWARDS_CONTRACT_ADDRESS=0x...
REWARD_SIGNER_PRIVATE_KEY=0x... # Use KMS/HSM in production
```

**Frontend (.env.local):**
```bash
VITE_VERY_TOKEN_ADDRESS=0x...
VITE_VERY_REWARDS_CONTRACT_ADDRESS=0x...
```

### 3. Grant MINTER_ROLE

The deployment script automatically grants `MINTER_ROLE` to VeryRewards contract. Verify:

```solidity
// VeryToken contract
MINTER_ROLE = keccak256("MINTER_ROLE")
hasRole(MINTER_ROLE, VeryRewards.address) == true
```

## Security Considerations

### On-Chain Protection
- ✅ Replay protection (`rewardUsed` mapping)
- ✅ Authorized signer only (EIP-191 verification)
- ✅ Input validation (non-zero amounts, valid addresses)

### Off-Chain Protection
- ✅ Rate limits per user (implement in RewardService)
- ✅ Sybil heuristics (wallet age, activity patterns)
- ✅ Minimum thresholds (tip amounts, quality scores)
- ✅ Blacklist/deny-list support

### Production Recommendations
1. **Use KMS/HSM** for reward signer private key (never hot wallet)
2. **Implement rate limiting** in RewardService (per user, per day)
3. **Add monitoring** for reward issuance patterns
4. **DAO governance** for adjusting reward amounts
5. **Event indexing** for analytics and leaderboards

## Integration Examples

### Tip Service Integration

```typescript
// server/services/TipService.ts
import { RewardService, RewardActionType } from './RewardService';

class TipService {
  private rewardService = new RewardService();

  async processTip(senderId, recipientId, amount, ...) {
    // ... existing tip processing ...

    // Issue reward to sender
    try {
      const rewardPayload = await this.rewardService.issueReward(
        senderWalletAddress,
        RewardActionType.TIP_SENT,
        { tipAmount: amount }
      );
      // Store payload for user to claim, or auto-claim via relayer
    } catch (error) {
      // Log but don't fail tip processing
      console.error('Reward issuance failed:', error);
    }
  }
}
```

### Frontend Claim Flow

```typescript
// User-friendly claim flow
const handleClaimReward = async () => {
  try {
    // 1. Issue reward from backend
    const payload = await issueReward(RewardActionType.TIP_SENT, {
      tipAmount: 2.5
    });

    if (!payload) {
      toast.error('Failed to issue reward');
      return;
    }

    // 2. Claim on-chain
    setStatus('claiming');
    const result = await claimRewardOnChain(payload);

    if (result.success) {
      toast.success(`You earned ${ethers.formatEther(payload.amount)} VERY!`);
      // Refresh balance
    } else {
      toast.error(result.error || 'Failed to claim reward');
    }
  } catch (error) {
    toast.error('Error claiming reward');
  } finally {
    setStatus('idle');
  }
};
```

## Event Indexing

The `RewardGranted` event should be indexed for:

- Total $VERY earned per user
- Daily/weekly leaderboards
- Achievement unlocks
- Anti-abuse analytics

**Event Signature:**
```solidity
event RewardGranted(
    address indexed user,
    uint256 amount,
    string reason,
    bytes32 indexed rewardHash
);
```

## DAO Upgrade Path

The system is designed for future DAO governance:

1. Transfer `Ownable` to DAO governor
2. Transfer `DEFAULT_ADMIN_ROLE` to DAO governor
3. DAO can:
   - Adjust reward amounts
   - Pause reward categories
   - Change reward signer
   - Add quadratic reward dampening
   - Cap daily minting

## Testing

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test test/VeryRewards.test.ts

# Test deployment
npx hardhat run scripts/deploy-very-rewards.ts --network hardhat
```

## Next Steps

Potential enhancements:
- 🔐 Vesting/lockups for earned $VERY
- 🧠 AI-weighted rewards (content quality model)
- 🏆 Achievement NFTs that boost rewards
- 📊 Leaderboard + analytics UI
- 🗳️ Governance-controlled reward parameters

## Support

For questions or issues, refer to:
- Contract code: `contracts/VeryToken.sol`, `contracts/VeryRewards.sol`
- Backend service: `server/services/RewardService.ts`
- API routes: `server/routes/rewards.ts`
- Frontend hook: `client/src/hooks/useRewards.ts`

