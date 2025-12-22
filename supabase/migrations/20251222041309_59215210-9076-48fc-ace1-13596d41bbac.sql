
-- Drop the old constraint and add a new one that includes 'draft'
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'ended'::text, 'draft'::text]));
