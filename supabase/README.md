# Supabase Integration

This directory contains the Supabase database schema, migrations, and mock data for the VeryTippers application.

## Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Note your project URL and API keys

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env` in the project root
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-public-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
     ```

3. **Run Database Migrations**
   - Open the Supabase SQL Editor
   - Copy and paste the contents of `migrations/001_supabase_schema.sql`
   - Execute the migration

4. **Seed Mock Data (Optional)**
   - Use the Supabase REST API or SQL Editor to insert data from `mock-data.json`
   - Or use the Supabase dashboard to manually insert test data

## Database Schema

The schema includes:

- **users**: User profiles with wallet addresses
- **ipfs_messages**: Encrypted messages stored on IPFS (CID references)
- **tips**: Tip ledger with status tracking (pending → submitted → confirmed)
- **meta_tx_queue**: Queue for meta-transactions awaiting relayer processing
- **relayer_logs**: Audit log for relayer operations
- **leaderboards**: Materialized leaderboard updated via triggers

## Row-Level Security (RLS)

RLS policies are configured to:
- Allow users to insert their own tips
- Allow users to view tips they sent or received
- Restrict updates to service role only
- Allow public read access to leaderboards

## Features

- **Realtime Subscriptions**: Frontend can subscribe to tip status changes
- **Automatic Leaderboard Updates**: Triggers update leaderboards when tips are confirmed
- **Idempotent Updates**: Status changes are atomic and idempotent
- **Audit Logging**: All relayer operations are logged

## Usage

### Frontend

```typescript
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeTips } from '@/hooks/useRealtimeTips';

// Sign in
const { user, signIn, signOut } = useAuth();

// Subscribe to realtime tip updates
const { tips, loading } = useRealtimeTips(user?.id);
```

### Backend

```typescript
import { enqueueMetaTx } from '@/server/services/supabase/enqueueMetaTx';

// Enqueue a meta-transaction
await enqueueMetaTx(tipId, {
  to: recipientAddress,
  amount: '1000000000000000000',
  cidHash: ipfsCid,
  nonce: 1,
  from: senderAddress
});
```

## Security Notes

- **Never expose `SUPABASE_SERVICE_ROLE_KEY`** in frontend code
- Always validate webhook requests with signatures
- Use RLS policies to restrict data access
- Rate limit public endpoints
- Monitor `relayer_logs` for anomalies

## Troubleshooting

- **RLS errors**: Ensure user is authenticated and policies are correctly configured
- **Realtime not working**: Check Supabase project settings and enable Realtime for the `tips` table
- **Trigger not firing**: Verify trigger function exists and is enabled
- **Service role errors**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly

