/*
  # Add Leverage Support to Trading Positions

  1. Changes
    - Add `leverage` column to `positions` table to track position leverage (1x-10x)
    - Default value is 1 (no leverage) for existing positions
  
  2. Notes
    - Leverage multiplies both potential profits and losses
    - Used in P&L calculations: PnL = (price_diff * quantity * leverage)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'positions' AND column_name = 'leverage'
  ) THEN
    ALTER TABLE positions ADD COLUMN leverage integer DEFAULT 1 NOT NULL;
  END IF;
END $$;
