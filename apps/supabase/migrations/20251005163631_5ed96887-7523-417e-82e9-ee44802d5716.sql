-- Add application_answers column to campaign_submissions table
ALTER TABLE public.campaign_submissions 
ADD COLUMN application_answers jsonb DEFAULT '[]'::jsonb;