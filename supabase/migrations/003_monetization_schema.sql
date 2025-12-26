-- Monetization & Checkout Schema
-- Run this migration in Supabase SQL Editor after 001_supabase_schema.sql

-- 1. balances (credits from Fiat purchases)
create table if not exists balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  credits numeric(30, 18) default 0,  -- credits represent VERY-credit units
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id)
);

-- 2. orders (Stripe checkout sessions)
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  amount_cents int not null,
  credits numeric(30, 18) not null,
  stripe_session_id text unique,
  status text default 'pending', -- pending, paid, failed, cancelled
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Update meta_tx_queue to support credit-based tips
-- Add columns if they don't exist (for backward compatibility)
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_name = 'meta_tx_queue' and column_name = 'user_id') then
    alter table meta_tx_queue add column user_id uuid references users(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns 
                 where table_name = 'meta_tx_queue' and column_name = 'to_address') then
    alter table meta_tx_queue add column to_address text;
  end if;
  if not exists (select 1 from information_schema.columns 
                 where table_name = 'meta_tx_queue' and column_name = 'amount') then
    alter table meta_tx_queue add column amount numeric(30, 18);
  end if;
  if not exists (select 1 from information_schema.columns 
                 where table_name = 'meta_tx_queue' and column_name = 'cid') then
    alter table meta_tx_queue add column cid text;
  end if;
  if not exists (select 1 from information_schema.columns 
                 where table_name = 'meta_tx_queue' and column_name = 'nonce') then
    alter table meta_tx_queue add column nonce bigint;
  end if;
  if not exists (select 1 from information_schema.columns 
                 where table_name = 'meta_tx_queue' and column_name = 'tx_hash') then
    alter table meta_tx_queue add column tx_hash text;
  end if;
end $$;

-- Indexes for performance
create index if not exists idx_balances_user_id on balances(user_id);
create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_orders_stripe_session_id on orders(stripe_session_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_meta_tx_queue_user_id on meta_tx_queue(user_id);
create index if not exists idx_meta_tx_queue_status on meta_tx_queue(status);

-- Function to initialize balance on user creation
create or replace function fn_init_user_balance() returns trigger as $$
begin
  insert into balances (user_id, credits, created_at, updated_at)
  values (NEW.id, 0, now(), now())
  on conflict (user_id) do nothing;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to auto-create balance for new users
drop trigger if exists trg_init_user_balance on users;
create trigger trg_init_user_balance
after insert on users
for each row
execute procedure fn_init_user_balance();

-- Row-Level Security (RLS) Policies

-- Enable RLS on balances
alter table balances enable row level security;

-- Policy: users can read their own balance
create policy "select_own_balance" on balances
  for select
  using ( auth.uid() = user_id::text );

-- Policy: service role can update balances
create policy "service_update_balance" on balances
  for update
  using ( 
    current_setting('request.jwt.claims', true) is not null 
    and (current_setting('request.jwt.claims','true')::json->>'role')::text = 'service_role'
  );

-- Enable RLS on orders
alter table orders enable row level security;

-- Policy: users can read their own orders
create policy "select_own_orders" on orders
  for select
  using ( auth.uid() = user_id::text );

-- Policy: users can insert their own orders
create policy "insert_own_orders" on orders
  for insert
  with check ( auth.uid() = user_id::text );

-- Policy: service role can update orders (for webhook)
create policy "service_update_orders" on orders
  for update
  using ( 
    current_setting('request.jwt.claims', true) is not null 
    and (current_setting('request.jwt.claims','true')::json->>'role')::text = 'service_role'
  );

