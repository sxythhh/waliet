-- Add application_questions column to bounty_campaigns table
ALTER TABLE public.bounty_campaigns 
ADD COLUMN application_questions jsonb DEFAULT NULL;