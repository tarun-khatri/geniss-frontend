/*
  # Crypto Prop Trading Platform Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `created_at` (timestamp)
    
    - `challenges`
      - `id` (uuid, primary key)
      - `name` (text) - e.g., "Instant", "Standard", "Accelerated"
      - `account_size` (numeric) - e.g., 2500, 5000, 10000, etc.
      - `price` (numeric) - one-time fee
      - `profit_target` (numeric) - percentage
      - `daily_loss_limit` (numeric) - percentage
      - `max_drawdown` (numeric) - percentage
      - `profit_split` (numeric) - percentage trader keeps
      - `phase_count` (integer) - 1 or 2 phases
      - `min_trading_days` (integer)
      - `leverage` (text) - e.g., "1:100"
      - `is_active` (boolean)
      - `created_at` (timestamp)
    
    - `user_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `challenge_id` (uuid, references challenges)
      - `status` (text) - 'active', 'passed', 'failed', 'pending'
      - `current_phase` (integer) - 1 or 2
      - `balance` (numeric) - current account balance
      - `initial_balance` (numeric) - starting balance
      - `profit_loss` (numeric) - total P&L
      - `daily_profit_loss` (numeric) - today's P&L
      - `total_trades` (integer) - number of trades
      - `winning_trades` (integer)
      - `losing_trades` (integer)
      - `trading_days` (integer) - count of days traded
      - `started_at` (timestamp)
      - `completed_at` (timestamp)
      - `created_at` (timestamp)
    
    - `trades`
      - `id` (uuid, primary key)
      - `user_account_id` (uuid, references user_accounts)
      - `symbol` (text) - e.g., "BTC/USDT"
      - `type` (text) - 'long' or 'short'
      - `entry_price` (numeric)
      - `exit_price` (numeric)
      - `quantity` (numeric)
      - `profit_loss` (numeric)
      - `opened_at` (timestamp)
      - `closed_at` (timestamp)
      - `status` (text) - 'open', 'closed'
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Challenges table (public read, admin write)
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_size numeric NOT NULL,
  price numeric NOT NULL,
  profit_target numeric NOT NULL,
  daily_loss_limit numeric NOT NULL,
  max_drawdown numeric NOT NULL,
  profit_split numeric NOT NULL,
  phase_count integer NOT NULL DEFAULT 1,
  min_trading_days integer NOT NULL DEFAULT 0,
  leverage text DEFAULT '1:100',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User accounts table
CREATE TABLE IF NOT EXISTS user_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id),
  status text NOT NULL DEFAULT 'active',
  current_phase integer NOT NULL DEFAULT 1,
  balance numeric NOT NULL,
  initial_balance numeric NOT NULL,
  profit_loss numeric DEFAULT 0,
  daily_profit_loss numeric DEFAULT 0,
  total_trades integer DEFAULT 0,
  winning_trades integer DEFAULT 0,
  losing_trades integer DEFAULT 0,
  trading_days integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON user_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON user_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON user_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  type text NOT NULL,
  entry_price numeric NOT NULL,
  exit_price numeric,
  quantity numeric NOT NULL,
  profit_loss numeric DEFAULT 0,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = trades.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = trades.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = trades.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = trades.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

-- Insert sample challenges
INSERT INTO challenges (name, account_size, price, profit_target, daily_loss_limit, max_drawdown, profit_split, phase_count, min_trading_days)
VALUES
  ('Instant $5K', 5000, 89, 10, 5, 10, 80, 1, 3),
  ('Instant $10K', 10000, 149, 10, 5, 10, 80, 1, 3),
  ('Instant $25K', 25000, 279, 10, 5, 10, 80, 1, 3),
  ('Instant $50K', 50000, 449, 10, 5, 10, 80, 1, 3),
  ('Instant $100K', 100000, 799, 10, 5, 10, 80, 1, 3),
  ('Standard $5K', 5000, 59, 8, 4, 6, 85, 2, 5),
  ('Standard $10K', 10000, 99, 8, 4, 6, 85, 2, 5),
  ('Standard $25K', 25000, 199, 8, 4, 6, 85, 2, 5),
  ('Standard $50K', 50000, 349, 8, 4, 6, 85, 2, 5),
  ('Standard $100K', 100000, 599, 8, 4, 6, 85, 2, 5),
  ('Accelerated $25K', 25000, 349, 10, 5, 10, 90, 1, 0),
  ('Accelerated $50K', 50000, 599, 10, 5, 10, 90, 1, 0),
  ('Accelerated $100K', 100000, 999, 10, 5, 10, 90, 1, 0);
