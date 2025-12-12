-- Add is_private column to bounty_campaigns table
ALTER TABLE public.bounty_campaigns
ADD COLUMN is_private boolean NOT NULL DEFAULT false;