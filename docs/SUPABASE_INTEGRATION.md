# Supabase Integration Guide

This guide covers the complete Supabase integration for VeryTippers, including database schema, frontend hooks, backend services, and realtime subscriptions.

## Overview

The Supabase integration provides:
- **Postgres Database**: Users, tips ledger, IPFS messages, meta-tx queue, relayer logs, leaderboards
- **Row-Level Security (RLS)**: Secure data access policies
- **Realtime Subscriptions**: Live updates for tip confirmations and leaderboards
- **Automatic Leaderboard Updates**: SQL triggers update leaderboards when tips are confirmed
- **Backend Services**: Meta-transaction queueing and indexer webhook handling

## Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and API keys:
   - Project URL: `https://your-project.supabase.co`
   - Anon Key: Public key for frontend
   - Service Role Key: Secret key for backend (never expose to client)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Frontend (Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key

# Backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
SUPABASE_ANON_KEY=your-public-anon-key
```

### 3. Run Database Migrations

1. Open Supabase SQL Editor
2. Run `supabase/migrations/001_supabase_schema.sql` to create tables, indexes, triggers, and RLS policies
3. Run `supabase/migrations/002_idempotent_update_function.sql` to create the idempotent update function

### 4. Enable Realtime

In Supabase Dashboard:
1. Go to Database → Replication
2. Enable replication for `tips` and `leaderboards` tables
3. This allows realtime subscriptions from the frontend

## Database Schema

### Tables

#### `users`
- User profiles with wallet addresses
- Fields: `id`, `username`, `wallet_address`, `display_name`, `avatar_url`, `metadata`

#### `ipfs_messages`
- IPFS message metadata (CID references)
- Fields: `id`, `cid`, `encrypted`, `length`, `author_id`

#### `tips`
- Tip ledger with status tracking
- Fields: `id`, `from_user`, `to_user`, `amount`, `cid_id`, `meta_tx`, `status`, `relayer_tx_hash`, `confirmations`, `chain_network`
- Status flow: `pending` → `submitted` → `confirmed`

#### `meta_tx_queue`
- Queue for meta-transactions awaiting relayer processing
- Fields: `id`, `tip_id`, `payload`, `priority`, `status`

#### `relayer_logs`
- Audit log for relayer operations
- Fields: `id`, `tip_id`, `action`, `actor`, `detail`

#### `leaderboards`
- Materialized leaderboard (auto-updated via trigger)
- Fields: `user_id`, `total_received`, `tip_count`, `last_tip_at`

### Triggers

- **`trg_update_leaderboard`**: Automatically updates leaderboard when a tip status changes to `confirmed`

### Functions

- **`fn_update_leaderboard_on_confirm()`**: Updates leaderboard on tip confirmation
- **`update_tip_confirmation()`**: Idempotent function for updating tip status (prevents duplicate confirmations)

## Frontend Integration

### Supabase Client

```typescript
import { supabase } from '@/lib/supabase';
```

The client is configured with realtime support and uses environment variables.

### Authentication Hook

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  
  // Use user, signIn, signUp, signOut
}
```

### Realtime Tips Hook

```typescript
import { useRealtimeTips } from '@/hooks/useRealtimeTips';

function TipsList() {
  const { tips, loading } = useRealtimeTips(user?.id);
  
  // Tips automatically update when status changes
}
```

### Tip Composer Component

```typescript
import TipComposer from '@/components/TipComposer';

<TipComposer 
  toUserId={recipientId}
  toUsername={recipientUsername}
  onTipCreated={() => console.log('Tip created!')}
/>
```

## Backend Integration

### Enqueue Meta-Transaction

```typescript
import { enqueueMetaTx } from '@/server/services/supabase/enqueueMetaTx';

// When a tip is ready for relayer processing
await enqueueMetaTx(tipId, {
  to: recipientAddress,
  amount: '1000000000000000000', // in wei
  cidHash: ipfsCid,
  nonce: 1,
  from: senderAddress,
  signature: signedPayload,
  priority: 100
});
```

### Indexer Webhook

The indexer webhook endpoint is available at `/api/indexer/webhook`:

```bash
POST /api/indexer/webhook
Content-Type: application/json

{
  "tipId": "uuid",
  "txHash": "0x...",
  "confirmations": 1,
  "status": "confirmed"
}
```

**Security**: Always validate webhook requests with signatures before processing.

## Realtime Subscriptions

### Subscribe to Tip Updates

```typescript
const channel = supabase
  .channel('tips-updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tips',
      filter: `or(from_user.eq.${userId},to_user.eq.${userId})`,
    },
    (payload) => {
      console.log('Tip updated:', payload);
      // Update UI
    }
  )
  .subscribe();

// Cleanup
supabase.removeChannel(channel);
```

### Subscribe to Leaderboard Updates

```typescript
const channel = supabase
  .channel('leaderboard-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'leaderboards',
    },
    (payload) => {
      console.log('Leaderboard updated:', payload);
      // Update leaderboard UI
    }
  )
  .subscribe();
```

## Row-Level Security (RLS)

### Tips Table

- **Insert**: Users can only insert tips where they are the `from_user`
- **Select**: Users can view tips where they are `from_user` or `to_user`
- **Update**: Only service role can update tips (for status changes)

### IPFS Messages

- **Insert**: Users can insert their own messages
- **Select**: Users can view messages they authored or messages referenced in their tips

### Leaderboards

- **Select**: Public read access (anyone can view leaderboards)

## Query Examples

### Get User Tips

```typescript
const { data, error } = await supabase
  .from('tips')
  .select('*')
  .or(`from_user.eq.${userId},to_user.eq.${userId}`)
  .order('created_at', { ascending: false });
```

### Get Leaderboard

```typescript
const { data, error } = await supabase
  .from('leaderboards')
  .select(`
    user_id,
    total_received,
    tip_count,
    last_tip_at,
    users:user_id (
      username,
      display_name,
      avatar_url
    )
  `)
  .order('total_received', { ascending: false })
  .limit(10);
```

### Get Pending Meta-Transactions

```typescript
// Backend only (service role)
const { data, error } = await supabase
  .from('meta_tx_queue')
  .select('*')
  .eq('status', 'queued')
  .order('priority', { ascending: false })
  .order('created_at', { ascending: true });
```

## Security Best Practices

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** in frontend code
2. **Validate webhook requests** with signatures from your indexer
3. **Use RLS policies** to restrict data access
4. **Rate limit** public endpoints
5. **Monitor `relayer_logs`** for anomalies
6. **Use HTTPS** for all API calls
7. **Sanitize user inputs** before database operations

## Troubleshooting

### RLS Errors

- **Error**: "new row violates row-level security policy"
- **Solution**: Ensure user is authenticated and policies are correctly configured

### Realtime Not Working

- **Error**: No realtime updates received
- **Solution**: 
  1. Check Supabase project settings
  2. Enable Realtime for the table in Database → Replication
  3. Verify subscription is active

### Trigger Not Firing

- **Error**: Leaderboard not updating
- **Solution**: 
  1. Verify trigger function exists
  2. Check trigger is enabled
  3. Ensure status change is from `pending`/`submitted` to `confirmed`

### Service Role Errors

- **Error**: "Invalid API key"
- **Solution**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly in backend environment

## Mock Data

See `supabase/mock-data.json` for example data to seed your database for testing.

## Next Steps

1. **Wallet-Based Authentication**: Integrate wallet signing with Supabase Auth
2. **Edge Functions**: Convert backend services to Supabase Edge Functions
3. **Storage**: Use Supabase Storage for NFT metadata and images
4. **Analytics**: Use Supabase Analytics for usage tracking

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/xfunc.html)

