-- Add budget column to bounty_campaigns to track boost balance
ALTER TABLE public.bounty_campaigns 
ADD COLUMN IF NOT EXISTS budget numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_used numeric DEFAULT 0;