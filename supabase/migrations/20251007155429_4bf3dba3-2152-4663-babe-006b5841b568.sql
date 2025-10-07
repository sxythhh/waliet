-- Add policy to allow public access to view social account campaign connections
CREATE POLICY "Social account campaigns are viewable by everyone" 
ON public.social_account_campaigns 
FOR SELECT 
USING (true);