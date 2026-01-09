-- Add policy to allow public access to view social accounts
CREATE POLICY "Social accounts are viewable by everyone" 
ON public.social_accounts 
FOR SELECT 
USING (true);

-- Add policy to allow public access to view campaigns
CREATE POLICY "Campaigns are viewable by everyone" 
ON public.campaigns 
FOR SELECT 
USING (true);