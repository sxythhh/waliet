-- Change default status for new campaigns to 'draft'
ALTER TABLE public.campaigns 
ALTER COLUMN status SET DEFAULT 'draft';