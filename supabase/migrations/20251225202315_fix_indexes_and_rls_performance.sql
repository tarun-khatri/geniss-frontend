/*
  # Fix Security and Performance Issues

  ## 1. Add Missing Foreign Key Indexes
  
  Adding indexes for foreign keys to improve query performance:
  - `payments.challenge_id` - Index for payments by challenge
  - `payments.user_account_id` - Index for payments by user account
  - `trades.user_account_id` - Index for trades by user account
  - `user_accounts.challenge_id` - Index for accounts by challenge
  - `user_accounts.user_id` - Index for accounts by user

  ## 2. Optimize RLS Policies for Performance
  
  Updating all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
  directly. This prevents re-evaluation of auth.uid() for each row, significantly
  improving query performance at scale.
  
  Tables updated:
  - `profiles` - 3 policies optimized
  - `user_accounts` - 3 policies optimized
  - `trades` - 3 policies optimized
  - `payments` - 2 policies optimized
  - `positions` - 4 policies optimized
  - `account_snapshots` - 4 policies optimized

  ## 3. Important Notes
  
  - Foreign key indexes improve JOIN performance and enforce referential integrity checks
  - RLS optimization reduces per-row function calls, critical for large datasets
  - All existing functionality is preserved, only performance is improved
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index for payments.challenge_id foreign key
CREATE INDEX IF NOT EXISTS idx_payments_challenge_id ON payments(challenge_id);

-- Index for payments.user_account_id foreign key
CREATE INDEX IF NOT EXISTS idx_payments_user_account_id ON payments(user_account_id);

-- Index for trades.user_account_id foreign key
CREATE INDEX IF NOT EXISTS idx_trades_user_account_id ON trades(user_account_id);

-- Index for user_accounts.challenge_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_accounts_challenge_id ON user_accounts(challenge_id);

-- Index for user_accounts.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);

-- ============================================================================
-- 2. OPTIMIZE RLS POLICIES - PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- 3. OPTIMIZE RLS POLICIES - USER_ACCOUNTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own accounts" ON user_accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON user_accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON user_accounts;

CREATE POLICY "Users can view own accounts"
  ON user_accounts FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own accounts"
  ON user_accounts FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own accounts"
  ON user_accounts FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- 4. OPTIMIZE RLS POLICIES - TRADES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own trades" ON trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
DROP POLICY IF EXISTS "Users can update own trades" ON trades;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = trades.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = trades.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = trades.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = trades.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 5. OPTIMIZE RLS POLICIES - PAYMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON payments;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- 6. OPTIMIZE RLS POLICIES - POSITIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own positions" ON positions;
DROP POLICY IF EXISTS "Users can create own positions" ON positions;
DROP POLICY IF EXISTS "Users can update own positions" ON positions;
DROP POLICY IF EXISTS "Users can delete own positions" ON positions;

CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = positions.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create own positions"
  ON positions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = positions.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own positions"
  ON positions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = positions.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = positions.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own positions"
  ON positions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = positions.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 7. OPTIMIZE RLS POLICIES - ACCOUNT_SNAPSHOTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own snapshots" ON account_snapshots;
DROP POLICY IF EXISTS "Users can create own snapshots" ON account_snapshots;
DROP POLICY IF EXISTS "Users can update own snapshots" ON account_snapshots;
DROP POLICY IF EXISTS "Users can delete own snapshots" ON account_snapshots;

CREATE POLICY "Users can view own snapshots"
  ON account_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = account_snapshots.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create own snapshots"
  ON account_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = account_snapshots.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own snapshots"
  ON account_snapshots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = account_snapshots.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = account_snapshots.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own snapshots"
  ON account_snapshots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.id = account_snapshots.user_account_id
      AND user_accounts.user_id = (select auth.uid())
    )
  );