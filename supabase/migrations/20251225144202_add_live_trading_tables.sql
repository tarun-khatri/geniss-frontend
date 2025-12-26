/*
  # Add Live Trading Support Tables

  1. New Tables
    - `positions`
      - `id` (uuid, primary key)
      - `user_account_id` (uuid, references user_accounts)
      - `symbol` (text) - Stock/crypto ticker symbol (e.g., AAPL, BTCUSD)
      - `side` (text) - 'long' or 'short'
      - `entry_price` (numeric) - Price when position was opened
      - `quantity` (numeric) - Number of shares/contracts
      - `current_price` (numeric) - Latest price for real-time P&L
      - `unrealized_pnl` (numeric) - Current profit/loss
      - `stop_loss` (numeric, nullable) - Stop loss price
      - `take_profit` (numeric, nullable) - Take profit price
      - `opened_at` (timestamptz) - When position was opened
      - `closed_at` (timestamptz, nullable) - When position was closed
      - `status` (text) - 'open', 'closed', 'liquidated'

    - `account_snapshots`
      - `id` (uuid, primary key)
      - `user_account_id` (uuid, references user_accounts)
      - `balance` (numeric) - Available cash balance
      - `equity` (numeric) - Total account value (balance + unrealized P&L)
      - `unrealized_pnl` (numeric) - Total unrealized P&L from open positions
      - `daily_pnl` (numeric) - P&L for current day
      - `daily_pnl_percent` (numeric) - Daily P&L as percentage
      - `max_drawdown` (numeric) - Maximum drawdown percentage
      - `snapshot_at` (timestamptz) - Timestamp of snapshot

  2. Changes to Existing Tables
    - Update trades table to add trade_type field ('open', 'close', 'liquidate')
    - Add position_id to link trades to positions

  3. Security
    - Enable RLS on new tables
    - Users can only access their own trading data through user_accounts relationship
*/

-- Create positions table
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('long', 'short')),
  entry_price numeric NOT NULL CHECK (entry_price > 0),
  quantity numeric NOT NULL CHECK (quantity > 0),
  current_price numeric NOT NULL CHECK (current_price > 0),
  unrealized_pnl numeric DEFAULT 0,
  stop_loss numeric CHECK (stop_loss IS NULL OR stop_loss > 0),
  take_profit numeric CHECK (take_profit IS NULL OR take_profit > 0),
  opened_at timestamptz DEFAULT now() NOT NULL,
  closed_at timestamptz,
  status text DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'closed', 'liquidated'))
);

-- Create account_snapshots table
CREATE TABLE IF NOT EXISTS account_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  equity numeric NOT NULL DEFAULT 0,
  unrealized_pnl numeric DEFAULT 0,
  daily_pnl numeric DEFAULT 0,
  daily_pnl_percent numeric DEFAULT 0,
  max_drawdown numeric DEFAULT 0,
  snapshot_at timestamptz DEFAULT now() NOT NULL
);

-- Add columns to existing trades table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'trade_type'
  ) THEN
    ALTER TABLE trades ADD COLUMN trade_type text DEFAULT 'close' CHECK (trade_type IN ('open', 'close', 'liquidate'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'position_id'
  ) THEN
    ALTER TABLE trades ADD COLUMN position_id uuid REFERENCES positions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_positions_user_account ON positions(user_account_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_account ON account_snapshots(user_account_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON account_snapshots(snapshot_at);
CREATE INDEX IF NOT EXISTS idx_trades_position ON trades(position_id);

-- Enable RLS
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_snapshots ENABLE ROW LEVEL SECURITY;

-- Positions policies
CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = positions.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own positions"
  ON positions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = positions.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own positions"
  ON positions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = positions.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = positions.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own positions"
  ON positions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = positions.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

-- Account snapshots policies
CREATE POLICY "Users can view own snapshots"
  ON account_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = account_snapshots.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own snapshots"
  ON account_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = account_snapshots.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own snapshots"
  ON account_snapshots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = account_snapshots.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = account_snapshots.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own snapshots"
  ON account_snapshots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = account_snapshots.user_account_id
      AND user_accounts.user_id = auth.uid()
    )
  );