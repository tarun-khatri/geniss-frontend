/*
  # Create Payments Table

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `challenge_id` (uuid, references challenges)
      - `user_account_id` (uuid, references user_accounts)
      - `invoice_id` (text) - ATLOS invoice ID
      - `order_id` (text) - Our internal order ID
      - `amount` (numeric) - Payment amount in USD
      - `status` (text) - 'pending', 'completed', 'failed', 'expired'
      - `user_email` (text) - Email used for payment
      - `payment_link` (text) - ATLOS payment link
      - `paid_at` (timestamptz) - When payment was completed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `payments` table
    - Add policies for authenticated users to view their own payments
    - Allow service role to insert/update for webhook handling

  3. Important Notes
    - This table tracks payment transactions with ATLOS
    - Postback endpoint will update payment status when confirmed
    - User accounts are created with 'pending' status until payment completes
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id),
  user_account_id uuid REFERENCES user_accounts(id),
  invoice_id text NOT NULL UNIQUE,
  order_id text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  user_email text NOT NULL,
  payment_link text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
