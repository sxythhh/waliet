-- Allow authenticated users to view earning transactions for leaderboard purposes
CREATE POLICY "Authenticated users can view earning transactions for leaderboard"
ON wallet_transactions
FOR SELECT
TO authenticated
USING (type = 'earning');

-- Allow all authenticated users to view profiles for leaderboard
CREATE POLICY "Authenticated users can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);