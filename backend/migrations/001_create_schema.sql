-- VeryTippers PostgreSQL Schema with TimescaleDB
-- Run this migration to set up the database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(42) UNIQUE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tips table (TimescaleDB hypertable for time-series data)
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL, -- stored in wei
  ipfs_cid VARCHAR(100) NOT NULL,
  moderation_result JSONB,
  tx_hash VARCHAR(66),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Convert tips table to hypertable
SELECT create_hypertable('tips', 'created_at', if_not_exists => TRUE);

-- User stats (materialized view for fast queries)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tips_sent BIGINT DEFAULT 0,
  tips_received BIGINT DEFAULT 0,
  amount_sent BIGINT DEFAULT 0,
  amount_received BIGINT DEFAULT 0,
  weekly_tips BIGINT DEFAULT 0,
  weekly_amount BIGINT DEFAULT 0,
  rank_global INTEGER,
  rank_weekly INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Badges & Achievements
CREATE TABLE IF NOT EXISTS badges (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(5) NOT NULL,
  rarity VARCHAR(20) NOT NULL,
  criteria JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id VARCHAR(50) REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, badge_id)
);

-- Insights cache
CREATE TABLE IF NOT EXISTS user_insights (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  insights JSONB NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tips_sender ON tips(sender_id);
CREATE INDEX IF NOT EXISTS idx_tips_recipient ON tips(recipient_id);
CREATE INDEX IF NOT EXISTS idx_tips_created ON tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_status ON tips(status);
CREATE INDEX IF NOT EXISTS idx_tips_tx_hash ON tips(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_stats_rank_global ON user_stats(rank_global);
CREATE INDEX IF NOT EXISTS idx_user_stats_rank_weekly ON user_stats(rank_weekly);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- Triggers for real-time stats updates
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sender stats
  INSERT INTO user_stats (user_id, tips_sent, amount_sent, weekly_tips, weekly_amount, updated_at)
  VALUES (NEW.sender_id, 1, NEW.amount, 1, NEW.amount, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    tips_sent = user_stats.tips_sent + 1,
    amount_sent = user_stats.amount_sent + NEW.amount,
    weekly_tips = user_stats.weekly_tips + 1,
    weekly_amount = user_stats.weekly_amount + NEW.amount,
    updated_at = NOW();
  
  -- Update recipient stats
  INSERT INTO user_stats (user_id, tips_received, amount_received, updated_at)
  VALUES (NEW.recipient_id, 1, NEW.amount, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    tips_received = user_stats.tips_received + 1,
    amount_received = user_stats.amount_received + NEW.amount,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS tips_update_stats ON tips;
CREATE TRIGGER tips_update_stats 
  AFTER INSERT ON tips 
  FOR EACH ROW 
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION update_user_stats();

-- Function to update ranks
CREATE OR REPLACE FUNCTION update_ranks()
RETURNS void AS $$
BEGIN
  -- Update global ranks
  UPDATE user_stats us
  SET rank_global = sub.rank
  FROM (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY amount_sent DESC) as rank
    FROM user_stats
  ) sub
  WHERE us.user_id = sub.user_id;
  
  -- Update weekly ranks (last 7 days)
  UPDATE user_stats us
  SET rank_weekly = sub.rank
  FROM (
    SELECT 
      sender_id as user_id,
      ROW_NUMBER() OVER (ORDER BY SUM(amount) DESC) as rank
    FROM tips
    WHERE created_at >= NOW() - INTERVAL '7 days'
      AND status = 'confirmed'
    GROUP BY sender_id
  ) sub
  WHERE us.user_id = sub.user_id;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to update ranks (requires pg_cron extension)
-- This can be run manually or via cron: SELECT cron.schedule('update-ranks', '*/5 * * * *', 'SELECT update_ranks();');

COMMENT ON TABLE tips IS 'Time-series table for all tips, partitioned by time using TimescaleDB';
COMMENT ON TABLE user_stats IS 'Materialized user statistics for fast leaderboard queries';
COMMENT ON TABLE badges IS 'Achievement badges that can be awarded to users';

