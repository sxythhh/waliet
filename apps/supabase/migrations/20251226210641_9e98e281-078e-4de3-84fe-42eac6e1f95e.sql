-- Add tags column to campaigns table for marketplace organization
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add an index for better filtering performance on tags
CREATE INDEX IF NOT EXISTS idx_campaigns_tags ON public.campaigns USING GIN(tags);