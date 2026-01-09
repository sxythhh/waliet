-- Allow users to create withdrawal transactions for themselves
CREATE POLICY "Users can create own withdrawal transactions"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND 
  type = 'withdrawal'
);