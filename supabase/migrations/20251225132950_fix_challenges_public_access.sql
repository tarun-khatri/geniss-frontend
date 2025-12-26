/*
  # Fix Challenges Public Access

  1. Changes
    - Update RLS policy on challenges table to allow public viewing
    - Remove authenticated-only restriction
    - Allow both authenticated and anonymous users to view active challenges

  2. Security
    - Public can only SELECT (read) active challenges
    - No write access for public users
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can view active challenges" ON challenges;

-- Create new policy that allows both authenticated and anonymous users
CREATE POLICY "Public can view active challenges"
  ON challenges
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);