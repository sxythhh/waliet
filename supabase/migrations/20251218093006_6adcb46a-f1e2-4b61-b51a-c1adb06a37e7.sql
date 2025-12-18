-- Add UPDATE policy for users to update their own social account campaigns
CREATE POLICY "Users can update own social account campaigns"
ON public.social_account_campaigns
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);