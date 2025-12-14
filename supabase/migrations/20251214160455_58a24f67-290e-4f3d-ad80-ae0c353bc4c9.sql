-- Change the default status for bounty_campaigns from 'active' to 'draft'
-- This ensures new boosts don't appear on discover until admin marks them active
ALTER TABLE public.bounty_campaigns ALTER COLUMN status SET DEFAULT 'draft';