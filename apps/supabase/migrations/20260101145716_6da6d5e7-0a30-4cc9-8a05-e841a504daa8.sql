
-- Add missing columns to bounty_campaigns table
ALTER TABLE public.bounty_campaigns 
ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS review_notes text;
