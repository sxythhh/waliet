-- Add asset_links and requirements columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS asset_links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS requirements TEXT[] DEFAULT '{}'::text[];