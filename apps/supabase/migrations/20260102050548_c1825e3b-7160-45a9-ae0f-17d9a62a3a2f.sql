-- Add application_answers column to bounty_applications table
ALTER TABLE public.bounty_applications 
ADD COLUMN application_answers JSONB DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.bounty_applications.application_answers IS 'Stores answers to custom application questions as JSON';