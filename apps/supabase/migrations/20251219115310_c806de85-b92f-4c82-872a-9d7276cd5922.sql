-- Add content_distribution column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS content_distribution text DEFAULT 'creators_own_page';

-- Add content_distribution column to bounty_campaigns table
ALTER TABLE public.bounty_campaigns 
ADD COLUMN IF NOT EXISTS content_distribution text DEFAULT 'creators_own_page';

-- Add comments for documentation
COMMENT ON COLUMN public.campaigns.content_distribution IS 'Distribution type: creators_own_page or branded_accounts';
COMMENT ON COLUMN public.bounty_campaigns.content_distribution IS 'Distribution type: creators_own_page or branded_accounts';