-- Add tags column to bounty_campaigns table
ALTER TABLE public.bounty_campaigns 
ADD COLUMN tags text[] DEFAULT NULL;