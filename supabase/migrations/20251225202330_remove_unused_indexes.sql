/*
  # Remove Unused Indexes

  ## Overview
  Removing database indexes that are not being utilized by queries.
  Unused indexes consume storage space and add overhead to write operations
  without providing any query performance benefits.

  ## Indexes Being Removed

  ### Positions Table
  - `idx_positions_user_account` - Unused index on user_account_id
  - `idx_positions_symbol` - Unused index on symbol

  ### Account Snapshots Table
  - `idx_snapshots_user_account` - Unused index on user_account_id
  - `idx_snapshots_timestamp` - Unused index on timestamp

  ### Trades Table
  - `idx_trades_position` - Unused index on position_id
  - `idx_trades_user_account_id` - Unused index on user_account_id

  ### Payments Table
  - `idx_payments_challenge_id` - Unused index on challenge_id
  - `idx_payments_user_account_id` - Unused index on user_account_id
  - `idx_payments_user_id` - Unused index on user_id
  - `idx_payments_invoice_id` - Unused index on invoice_id
  - `idx_payments_order_id` - Unused index on order_id
  - `idx_payments_status` - Unused index on status

  ### User Accounts Table
  - `idx_user_accounts_challenge_id` - Unused index on challenge_id
  - `idx_user_accounts_user_id` - Unused index on user_id

  ## Benefits
  1. Reduces storage overhead
  2. Improves write performance (INSERT, UPDATE, DELETE operations)
  3. Simplifies database maintenance
  4. Reduces backup size and time

  ## Important Notes
  - These indexes were identified as unused through query analysis
  - If query patterns change in the future and these become needed, they can be recreated
  - Primary key and foreign key constraints remain intact
  - Default PostgreSQL indexes on primary keys continue to provide necessary performance
*/

-- ============================================================================
-- DROP UNUSED INDEXES - POSITIONS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_positions_user_account;
DROP INDEX IF EXISTS idx_positions_symbol;

-- ============================================================================
-- DROP UNUSED INDEXES - ACCOUNT SNAPSHOTS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_snapshots_user_account;
DROP INDEX IF EXISTS idx_snapshots_timestamp;

-- ============================================================================
-- DROP UNUSED INDEXES - TRADES TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_trades_position;
DROP INDEX IF EXISTS idx_trades_user_account_id;

-- ============================================================================
-- DROP UNUSED INDEXES - PAYMENTS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_payments_challenge_id;
DROP INDEX IF EXISTS idx_payments_user_account_id;
DROP INDEX IF EXISTS idx_payments_user_id;
DROP INDEX IF EXISTS idx_payments_invoice_id;
DROP INDEX IF EXISTS idx_payments_order_id;
DROP INDEX IF EXISTS idx_payments_status;

-- ============================================================================
-- DROP UNUSED INDEXES - USER ACCOUNTS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_user_accounts_challenge_id;
DROP INDEX IF EXISTS idx_user_accounts_user_id;
