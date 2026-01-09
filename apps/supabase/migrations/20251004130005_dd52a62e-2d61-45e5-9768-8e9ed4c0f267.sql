-- Allow users to update their own wallet's payout methods
CREATE POLICY "Users can update own wallet payout methods"
ON public.wallets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);