-- Add blueprint_embed_url field to bounty_campaigns table
ALTER TABLE public.bounty_campaigns
ADD COLUMN blueprint_embed_url text;