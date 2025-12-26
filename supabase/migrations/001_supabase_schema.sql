-- Supabase Integration Schema
-- Run this migration in Supabase SQL Editor

-- 1. users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  username text unique,
  wallet_address text unique,
  display_name text,
  avatar_url text,
  metadata jsonb
);

-- 2. ipfs_messages (stores metadata and CID from IPFS)
create table if not exists ipfs_messages (
  id uuid primary key default gen_random_uuid(),
  cid text not null,
  encrypted boolean default true,
  length int,
  created_at timestamptz default now(),
  author_id uuid references users(id) on delete set null
);

-- 3. tips ledger (one row per tip attempt / on-chain settlement)
create table if not exists tips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  from_user uuid references users(id) not null,
  to_user uuid references users(id) not null,
  amount numeric(30, 18) not null,
  cid_id uuid references ipfs_messages(id) null,
  meta_tx jsonb,          -- metaTx payload (optional)
  status text default 'pending', -- pending, submitted, confirmed, failed
  relayer_tx_hash text,   -- chain tx hash once submitted
  confirmations int default 0,
  chain_network text default 'very-testnet',
  notes text
);

-- 4. meta_tx_queue (works as an operational queue)
create table if not exists meta_tx_queue (
  id bigserial primary key,
  created_at timestamptz default now(),
  tip_id uuid references tips(id) on delete cascade,
  payload jsonb,
  priority int default 100,
  status text default 'queued' -- queued, processing, done, failed
);

-- 5. relayer_logs (for auditing)
create table if not exists relayer_logs (
  id bigserial primary key,
  created_at timestamptz default now(),
  tip_id uuid references tips(id),
  action text,
  actor text,
  detail jsonb
);

-- 6. leaderboards (materialized or regular table updated via trigger)
create table if not exists leaderboards (
  user_id uuid primary key references users(id),
  total_received numeric(30,18) default 0,
  tip_count int default 0,
  last_tip_at timestamptz
);

-- Indexes for performance
create index if not exists idx_tips_status on tips(status);
create index if not exists idx_tips_from_to on tips(from_user, to_user);
create index if not exists idx_tips_to_user on tips(to_user);
create index if not exists idx_meta_tx_queue_status on meta_tx_queue(status);
create index if not exists idx_meta_tx_queue_priority on meta_tx_queue(priority);
create index if not exists idx_ipfs_messages_cid on ipfs_messages(cid);
create index if not exists idx_ipfs_messages_author on ipfs_messages(author_id);

-- Function to update leaderboard on tip confirmed
create or replace function fn_update_leaderboard_on_confirm() returns trigger as $$
begin
  if (tg_op = 'UPDATE' and NEW.status = 'confirmed' and OLD.status != 'confirmed') then
    insert into leaderboards (user_id, total_received, tip_count, last_tip_at)
    values (NEW.to_user, NEW.amount, 1, now())
    on conflict (user_id) do update
      set total_received = leaderboards.total_received + NEW.amount,
          tip_count = leaderboards.tip_count + 1,
          last_tip_at = now();
    return NEW;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to auto-update leaderboard
create trigger trg_update_leaderboard
after update on tips
for each row
execute procedure fn_update_leaderboard_on_confirm();

-- Row-Level Security (RLS) Policies

-- Enable RLS on tips
alter table tips enable row level security;

-- Policy: users can insert their own tips (as 'from_user')
create policy "allow_insert_own_tip" on tips
  for insert
  with check ( auth.uid() = from_user::text );

-- Policy: users can select tips where they are from or to
create policy "select_own" on tips
  for select
  using ( auth.uid() = from_user::text or auth.uid() = to_user::text );

-- Policy: update by service (only service role)
-- Note: Service role key bypasses RLS, but this policy allows explicit service role checks
create policy "service_update" on tips
  for update
  using ( 
    current_setting('request.jwt.claims', true) is not null 
    and (current_setting('request.jwt.claims','true')::json->>'role')::text = 'service_role'
  );

-- Enable RLS on ipfs_messages
alter table ipfs_messages enable row level security;

-- Policy: users can insert their own IPFS messages
create policy "allow_insert_own_ipfs" on ipfs_messages
  for insert
  with check ( auth.uid() = author_id::text );

-- Policy: users can select IPFS messages they authored or are referenced in their tips
create policy "select_own_ipfs" on ipfs_messages
  for select
  using ( 
    auth.uid() = author_id::text 
    or exists (
      select 1 from tips 
      where (tips.from_user::text = auth.uid()::text or tips.to_user::text = auth.uid()::text)
      and tips.cid_id = ipfs_messages.id
    )
  );

-- Enable RLS on users (basic policies)
alter table users enable row level security;

-- Policy: users can read all user profiles (for leaderboard, etc.)
create policy "select_all_users" on users
  for select
  using ( true );

-- Policy: users can update their own profile
create policy "update_own_profile" on users
  for update
  using ( auth.uid() = id::text );

-- Enable RLS on leaderboards
alter table leaderboards enable row level security;

-- Policy: anyone can read leaderboards
create policy "select_leaderboards" on leaderboards
  for select
  using ( true );

-- Note: meta_tx_queue and relayer_logs should be accessed only via service role
-- They don't need RLS policies as they're backend-only tables

