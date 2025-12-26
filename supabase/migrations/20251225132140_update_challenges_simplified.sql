/*
  # Simplify Challenges to Accelerated Only

  1. Changes
    - Remove all existing challenges
    - Add 3 new simplified Accelerated challenges:
      - $10K account at $30
      - $20K account at $50
      - $30K account at $100
    - All with 30% profit split
    - Single phase evaluation
    - 10% profit target
    - 5% daily loss limit
    - 10% max drawdown
*/

-- Remove existing challenges
DELETE FROM challenges;

-- Insert new simplified challenges
INSERT INTO challenges (name, account_size, price, profit_target, daily_loss_limit, max_drawdown, profit_split, phase_count, min_trading_days, leverage, is_active)
VALUES
  ('Accelerated $10K', 10000, 30, 10, 5, 10, 30, 1, 0, '1:100', true),
  ('Accelerated $20K', 20000, 50, 10, 5, 10, 30, 1, 0, '1:100', true),
  ('Accelerated $30K', 30000, 100, 10, 5, 10, 30, 1, 0, '1:100', true);
