-- Add campaign_update column to campaigns table for admin announcements
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS campaign_update text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS campaign_update_at timestamp with time zone;