-- Add categories column to bounty_campaigns table
ALTER TABLE public.bounty_campaigns ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';